import { Alert } from "react-native"
import { useChunkStore } from "../db/chunkStore"
import { current, produce } from "immer";
import {Buffer} from 'buffer';



export const receivedFileAck = async(data:any, socket:any, setreceivedFiles: any) => {
    const { setChunkStore, chunkStore } = useChunkStore.getState()

    if(chunkStore) {
        Alert.alert("There are files that needs to be received please wait...");
        return;
    }

    setreceivedFiles((prevData:any) => 
        produce(prevData, (draft:any) => {
            draft.push(data)
        })
    );

    setChunkStore({
        id: data?.id,
        totalChunks: data?.totalChunks,
        name: data?.name,
        size: data?.size,
        mimeType: data?.mimeType,
        chunkArray: []
    })


    if(!socket){
        console.log("Socket is unavailable");
        return;
    }

    try {
        await new Promise((resolve) => setTimeout(resolve,10))
        console.log("FILE RECEIVED");
        socket.write(JSON.stringify({event: 'send_chunk_ack', chunkNo: 0}))
        console.log("REQUESTED FOR FIRST CHUNK");
    } catch (error) {
        console.error("Error receiving file", error);
    }
}


export const sendChunkAck = async(chunkIndex:any, socket:any, settotalSentBytes:any, setsentFiles:any) => {
    const {currentChunkSet, resetCurrentChunkSet} = useChunkStore.getState()
    
    if(!currentChunkSet){
        Alert.alert('There are no chunks to be sent');
        return;
    }
    
    if(!socket){
        console.log("Socket is unavailable");
        return;
    }
    
    const totalChunks = currentChunkSet?.totalChunks;
    
    try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        socket.write(
            JSON.stringify({
                event: 'receive_chunk_ack',
                chunk: currentChunkSet?.chunkArray[chunkIndex].toString('base64'),
                chunkNo: chunkIndex
            })
        )
        settotalSentBytes((prev: number) => prev + currentChunkSet.chunkArray[chunkIndex]?.length)

        if(chunkIndex + 2 > totalChunks){
            console.log("ALL CHUNKS SENT SUCCESSFULLY")
            setsentFiles((prevFiles: any) => 
                produce(prevFiles, (draftFiles: any) =>{
                    const fileIndex = draftFiles?.findIndex((f:any) => f.id === currentChunkSet.id)
                    if(fileIndex !== -1){
                        draftFiles[fileIndex].available = true
                    }
                })
            )

            resetCurrentChunkSet()
        }
    } catch (error) {
        console.error("Error Sending File: ", error)
    }
}


export const receiveChunkAck = async(
    chunk: any,
    chunkNo: any,
    socket: any,
    settotalReceivedBytes: any,
    generateFile: any,
) => {
    const {chunkStore, resetChunkStore, setChunkStore} = useChunkStore.getState()
    if(!chunkStore){
        console.log("Chunk Store is NULL")
        return
    }

    try {
        const bufferChunk = Buffer.from(chunk,'base64')
        const updatedChunkArray = [...(chunkStore.chunkArray || [])]
        updatedChunkArray[chunkNo] = bufferChunk;
        setChunkStore({
            ...chunkStore,
            chunkArray: updatedChunkArray
        })
        settotalReceivedBytes((prevValue: number) => prevValue + bufferChunk.length)
    } catch (error) {
        console.log("Error updating chunk", error)
    }

    if(!socket){
        console.log("Socket noy available")
        return;
    }

    if(chunkNo + 1 === chunkStore?.totalChunks){
        console.log("ALL CHUNKS RECEIVED")
        generateFile()
        resetChunkStore()
        return;
    }

    try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        console.log("REQUESTED FOR NEXT CHUNK ", chunkNo + 1);
        socket.write(JSON.stringify({event: 'send_chunk_ack', chunkNo: chunkNo + 1}))
    } catch (error) {
        console.log('Error sending file: ',error)
    }

}