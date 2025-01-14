import React, { FC, useEffect, useRef, useState } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, Image } from 'react-native'
import { useTCP } from '../service/TCPProvider'
import { goBack, navigate } from '../utils/NavigationUtil'
import LinearGradient from 'react-native-linear-gradient'
import { sendStyles } from '../styles/sendStyles'
import Icon from '../components/global/Icon'
import CustomText from '../components/global/CustomText'
import BreakerText from '../components/ui/BreakerText'
import { Colors } from '../utils/Constants'
import LottieView from 'lottie-react-native'
import QRGenerateModal from '../components/modals/QRGenerateModal'
import DeviceInfo from 'react-native-device-info'
import dgram from 'react-native-udp'
import { getBroadcastIPAddress, getLocalIPAddress } from '../utils/networkUtils'
import { Platform } from 'react-native'

const deviceNames = ['Oppo',"Vivo X1", 'Realme', "Samsung S21", 'Iphone 16','Oneplus 9']

const ReceiveScreen:FC = () => {

  const {startServer, server, isConnected} = useTCP()
  const [qrValue, setqrValue] = useState('')
  const [isScannerVisible, setisScannerVisible] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const setupServer = async() => {
    const deviceName = await DeviceInfo.getDeviceName();
    const ip = await getLocalIPAddress();
    const port = 4000;

    if(!server){
      startServer(port);
    }

    setqrValue(`tcp://${ip}:${port}|${deviceName}`);
    console.log(`Server info: ${ip}:${port}`)
  }

  const sendDiscoverySignal = async() => {
    const deviceName = await DeviceInfo.getDeviceName();
    const broadcastAddress = await getBroadcastIPAddress();
    const targetAddress = broadcastAddress || "255.255.255.255";
    const port = 57143;

    console.log(broadcastAddress);
    console.log(targetAddress);

    const client = dgram.createSocket({
      type: 'udp4',
      reusePort: true
    })

    client.bind(() => {
      try {
        if(Platform.OS === 'ios') {
          client.setBroadcast(true);
        }
        client.send(`${qrValue}`,0,`${qrValue}`.length,port,targetAddress,(err)=>{
          if(err){
            console.log("Error sending discovery signal ",err)
          } else{
            console.log(`${deviceName} Discovery Signal sent to ${targetAddress}`)
          }
          client.close()
        });
      } catch (error) {
        console.error("Failed to set broadcast or send",error)
        client.close()
      }
    })
  }

  useEffect(() => {
    if (isConnected) {
      // Stop broadcasting when connected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
  
      // Navigate to the next screen
      navigate("ConnectionScreen");
    }
  }, [isConnected]);
  

  useEffect(() => {
    if(!qrValue) return;

    sendDiscoverySignal();
    intervalRef.current = setInterval(sendDiscoverySignal, 1000);

    return () => {
      if(intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null;
      }
    };
     }, [qrValue]);
  

  const handleGoBack=()=>{
    if(intervalRef.current){
      clearInterval(intervalRef.current) 
      intervalRef.current = null
    }
    goBack();
  }


  useEffect(() => {
    setupServer()
  }, [])
  

  useEffect(() => {
    if(isConnected){
      navigate("ConnectionScreen")
    }

  }, [isConnected])



  return (
    <LinearGradient
      colors={['#FFFFFF','#4DA0DE','#3387C5']}
      style={sendStyles.container}
      start={{x:0,y:1}}
      end={{x:0, y:0}}
    >
      <SafeAreaView/>

        <View style={sendStyles.mainContainer}>
          <View style={sendStyles.infoContainer}>
            <Icon name='blur-on' iconFamily='MaterialIcons' color='#fff' size={40}/>

            <CustomText fontFamily='Okra-Bold' color='#fff' fontSize={16} style={{marginTop: 20}}>
              Receiving from nearby devices
            </CustomText>

            <CustomText fontFamily='Okra-Medium' color='#fff' fontSize={12} style={{textAlign: 'center'}}>
              Ensure your device is connected to the sender's hotspot network.
            </CustomText>

            <BreakerText text='or'/>

            <TouchableOpacity style={sendStyles.qrButton} onPress={() => setisScannerVisible(true)}>
              <Icon name='qrcode-scan' iconFamily='MaterialCommunityIcons' color={Colors.primary} size={16}/>
              <CustomText fontFamily='Okra-Bold' color={Colors.primary}>
                Scan QR
              </CustomText>
            </TouchableOpacity>

          </View>

          <View style={sendStyles.animationContainer}>
            <View style={sendStyles.lottieContainer}>
              <LottieView
                style={sendStyles.lottie}
                source={require('../assets/animations/scan2.json')}
                autoPlay
                loop={true}
                hardwareAccelerationAndroid
              />
              
            </View>

            <Image source={require('../assets/images/profile.jpeg')} style={sendStyles.profileImage}/>
          </View>

          <TouchableOpacity onPress={handleGoBack} style={sendStyles.backButton}>
              <Icon name='arrow-back' iconFamily='Ionicons' size={16} color='#000'/>
          </TouchableOpacity>

          {
            isScannerVisible && (
              <QRGenerateModal visible={isScannerVisible} onClose={() => setisScannerVisible(false)}/>
            )
          }

        </View>
    </LinearGradient>
  )
}
export default ReceiveScreen