import { createContext, useContext } from "react";



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

const TCPContext = createContext<TCPContextType | undefined>(undefined);f

export const useTCP=():TCPContextType=>{
    const context = useContext(TCPContext)
    if(!context){
        throw new Error("useTCP must be used within a TCPProvider")
    }
    return context;
}