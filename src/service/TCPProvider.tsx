import 'react-native-get-random-values'
import React, { FC, createContext, useCallback, useContext, useState } from "react";
import { useChunkStore } from "../db/chunkStore";
import TcpSocket from 'react-native-tcp-socket';
import DeviceInfo from "react-native-device-info";
import { Alert, Platform } from "react-native";
import {Buffer} from 'buffer'
import RNFS from "react-native-fs";
import {v4 as uuidv4} from 'uuid';
import {produce} from 'immer';
import { receiveChunkAck, receivedFileAck, sendChunkAck } from './TCPUtils';


interface TCPContextType {
    server: any;
    client: any;
    isConnected: boolean;
    connectedDevice: any;
    sentFiles: any;
    receivedFiles: any;
    totalSentBytes: number;
    totalReceivedBytes: number;
    startServer: (port: number) => void;
    connectedToServer: (host: string, port: number, deviceName: string) => void;
    sendMessage: (message: string | Buffer) => void;
    sendFileAck: (file: any, type: 'file' | 'image') => void;
    disconnect: () => void;
}

const TCPContext = createContext<TCPContextType | undefined>(undefined);

export const useTCP=():TCPContextType=>{
    const context = useContext(TCPContext)
    if(!context){
        throw new Error("useTCP must be used within a TCPProvider")
    }
    return context;
}


const options = {
    keystore: require('../../tls_certs/server-keystore.p12')
}

export const TCPProvider:FC<{children:React.ReactNode}>=({children})=>{

     const [server, setserver] = useState<any>(null);
     const [client, setclient] = useState<any>(null);
     const [isConnected, setisConnected] = useState(false);
     const [connectedDevice, setconnectedDevice] = useState<any>(null)
     const [serverSocket, setserverSocket] = useState<any>(null)
     const [sentFiles, setsentFiles] = useState<any>([])
     const [receivedFiles, setreceivedFiles] = useState<any>([])
     const [totalSentBytes, settotalSentBytes] = useState<number>(0)
     const [totalReceivedBytes, settotalReceivedBytes] = useState<number>(0)


     const { currentChunkSet, setCurrentChunkSet, setChunkStore } = useChunkStore();

     //START SERVER
     const startServer = useCallback((port:number) => {
        if(server) {
            console.log("Server already started")
            return;
        }

        const newServer = TcpSocket.createTLSServer(options, (socket) => {
            console.log('Client connected', socket.address());

            setserverSocket(socket);
            socket.setNoDelay(true);
            socket.readableHighWaterMark = 1024 * 1024 * 1;
            socket.writableHighWaterMark = 1024 * 1024 * 1;


            socket.on('data', async(data) => {
                const parsedData = JSON.parse(data?.toString());

                if(parsedData?.event === 'connect'){
                    setisConnected(true)
                    setconnectedDevice(parsedData?.deviceName)
                }

                if(parsedData?.event === 'file_ack'){
                    receivedFileAck(parsedData?.file,socket,setreceivedFiles)
                }

                if(parsedData?.event === 'send_chunk_ack'){
                    sendChunkAck(parsedData?.chunkNo, socket, settotalSentBytes, setsentFiles);
                }

                if(parsedData?.event === 'receive_chunk_ack'){
                    receiveChunkAck(parsedData?.chunk, parsedData?.chunkNo, socket, settotalReceivedBytes, generateFile);
                }
            });
            
            socket.on('close', ()=>{
                console.log('Client disconnected');
                setreceivedFiles([])
                setsentFiles([])
                setCurrentChunkSet(null)
                settotalReceivedBytes(0)
                setChunkStore(null)
                setisConnected(false)
                disconnect()
            })


            socket.on('error', (error) => {
                console.error('Server error', error);
            });

            
        })

        newServer.listen({port, host: '0.0.0.0'},() => {
            const address = newServer.address();
            console.log(`Server listening at ${address?.address}:${address?.port}`);
        })

        newServer.on('error', (error) => console.error('Server error', error));
        setserver(newServer);

     },[server])

     //START CLIENT
     const connectedToServer = useCallback((host: string, port: number, deviceName: string) => {
        const newClient = TcpSocket.connectTLS({
            host,
            port,
            cert: true,
            ca: require('../../tls_certs/server-cert.pem')
        },
        () => {
            setisConnected(true);
            setconnectedDevice(deviceName)
            const myDeviceName = DeviceInfo.getDeviceNameSync()
            newClient.write(JSON.stringify({event: 'connect', deviceName: myDeviceName}))
        })

        newClient.setNoDelay(true);
        newClient.readableHighWaterMark = 1024 * 1024 * 1;
        newClient.writableHighWaterMark = 1024 * 1024 * 1;

        newClient.on('data', async(data) => {
            const parsedData = JSON.parse(data?.toString());

            if(parsedData?.event === 'file_ack'){
                receivedFileAck(parsedData?.file,newClient,setreceivedFiles)
            }

            if(parsedData?.event === 'send_chunk_ack'){
                sendChunkAck(parsedData?.chunkNo, newClient, settotalSentBytes, setsentFiles);
            }

            if(parsedData?.event === 'receive_chunk_ack'){
                receiveChunkAck(parsedData?.chunk, parsedData?.chunkNo, newClient, settotalReceivedBytes, generateFile);
            }
        })

        newClient.on('close', () => {
            console.log('Connection closed');
            setreceivedFiles([])
            setsentFiles([])
            setCurrentChunkSet (null)
            settotalReceivedBytes(0)
            setChunkStore(null)
            setisConnected(false)
            disconnect()
        })

        newClient.on('error', (error) => {
            console.error('Client error', error);
        });

        setclient(newClient);

     },[client])

     //DISCONNECT
     const disconnect = useCallback(() => {
        if(client){
            client.destroy();
        }
        if(server){
            server.close();
        }
        setreceivedFiles([])
        setsentFiles([])
        setCurrentChunkSet (null)
        settotalReceivedBytes(0)
        setChunkStore(null)
        setisConnected(false)

     },[client,server])

    
     //SEND MESSAGE
     const sendMessage = useCallback((message: string | Buffer) => {
        if(client){
            client.write(JSON.stringify(message))
            console.log("Sent from client:", message);
        }else if(server){
            serverSocket.write(JSON.stringify(message))
            console.log("Sent from server:", message);
        }else{
            console.error("No client or server connected")
        }
    },[client,server])
    
    //SEND FILE ACK
    const sendFileAck = async(file:any,type: 'image' | 'file') => {
        if(currentChunkSet != null) {
            Alert.alert("Wait for current file to be sent!")
            return
        }
        
        const normalizedPath = Platform.OS === 'ios' ? file?.uri?.replace('file://', '') : file?.uri;
        const fileData = await RNFS.readFile(normalizedPath, 'base64')
        const buffer = Buffer.from(fileData,'base64')
        const CHUNK_SIZE = 1024 * 8;
        let totalChunks = 0;
        let offset = 0;
        let chunkArray = [];
        
        while(offset < buffer.length) {
            const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
            totalChunks++;
            chunkArray.push(chunk);
            offset += chunk.length;
        }

        const rawData = {
            id: uuidv4(),
            name: type === 'file' ? file?.name : file?.fileName,
            size: type === 'file' ? file?.size : file?.fileSize,
            mimeType: type === 'file' ? 'file' : '.jpg',
            totalChunks
        }

        setCurrentChunkSet({
            id: rawData?.id,
            chunkArray,
            totalChunks
        })

        setsentFiles((prevData: any) => 
            produce(prevData, (draft: any) => {
                draft.push({
                    ...rawData,
                    uri: file?.uri
                })
            })
        )

        const socket = client || serverSocket;
        if(!socket) {
            console.error("Socket is not connected. Cannot send file acknowledgment.");
            return;
        }


        try {
            console.log("FILE ACKNOWLEDGE DONE")
            socket.write(JSON.stringify({ event: 'file_ack', file: rawData }))
        } catch (error) {
            console.log("Error Sending file: ", error)
        }
        
     }

     //GENERATE FILE
     const generateFile = async() => {
        const { chunkStore, resetChunkStore } = useChunkStore.getState();
        if(!chunkStore) {
            console.log("No Chunks or files to process")
            return;
        }

        if(chunkStore?.totalChunks !== chunkStore.chunkArray.length){
            console.error('Not all chunks have been received.');
            return;
        }

        try {
            const combinedChunks = Buffer.concat(chunkStore.chunkArray)
            const platformPath = Platform.OS == 'ios' ? `${RNFS.DocumentDirectoryPath}` : `${RNFS.DownloadDirectoryPath}`
            const filePath = `${platformPath}/${chunkStore.name}`

            await RNFS.writeFile(filePath, combinedChunks?.toString('base64'),'base64')
            setreceivedFiles((prevFiles:any) => 
                produce(prevFiles,(draftFiles:any)=> {
                    const fileIndex = draftFiles?.findIndex((f:any) => f.id === chunkStore.id)
                    if(fileIndex !== -1) {
                        draftFiles[fileIndex] = {
                            ...draftFiles[fileIndex],
                            uri: filePath,
                            available: true,
                        }
                    }
                })
            )

            console.log("FILE SAVED SUCCESSFULLY", filePath)
            resetChunkStore()

        } catch (error) {
            console.error('Error combining chunks or saving file: ',error);
        }
     }

    return (
        <TCPContext.Provider value={{
            server,
            client,
            connectedDevice,
            sentFiles,
            receivedFiles,
            totalReceivedBytes,
            totalSentBytes,
            isConnected,
            startServer,
            connectedToServer,
            disconnect,
            sendMessage,
            sendFileAck
        }}>
            {children}
        </TCPContext.Provider>
    )
}
