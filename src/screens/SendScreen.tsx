import React, { FC, useEffect, useState } from 'react'
import { View, Text, Animated, Easing, SafeAreaView, TouchableOpacity, Image } from 'react-native'
import { useTCP } from '../service/TCPProvider'
import { goBack, navigate } from '../utils/NavigationUtil'
import dgram from 'react-native-udp'
import LinearGradient from 'react-native-linear-gradient'
import { sendStyles } from '../styles/sendStyles'
import Icon from '../components/global/Icon'
import CustomText from '../components/global/CustomText'
import BreakerText from '../components/ui/BreakerText'
import { Colors, screenWidth } from '../utils/Constants'
import LottieView from 'lottie-react-native'
import QRScannerModal from '../components/modals/QRScannerModal'

const deviceNames = ['Oppo',"Vivo X1", 'Realme', "Samsung S21", 'Iphone 16','Oneplus 9']

const SendScreen:FC = () => {

  const {connectedToServer, isConnected} = useTCP()
  const [isScannerVisible, setisScannerVisible] = useState(false)
  const [nearbyDevices, setnearbyDevices] = useState<any[]>([])

  const handleScan = (data:any) => {
    const [connectionData, deviceName] = data.replace('tcp://','').split('|');
    const [host, port] = connectionData.split(':')
    connectedToServer(host, parseInt(port,10), deviceName);
  }

  const listenForDevices = async() => {
    const server = dgram.createSocket({
      type: 'udp4',
      reusePort: true,
    });
    const port = 57143;
    server.bind(port,() => {
      console.log("Listening for nearby devices...");
    })
    server.on('message', (msg,rinfo)=>{
      const [connectionData, otherDevice] = msg?.toString()?.replace('tcp://','').split('|');
      setnearbyDevices((prevDevices) => {
        const deviceExists = prevDevices?.some(device => device?.name === otherDevice)
        if(!deviceExists){
          const newDevice = {
            id: `${Date.now()}_${Math.random()}`,
            name: otherDevice,
            image: require('../assets/icons/device.jpeg'),
            fullAddress: msg?.toString(),
            position: getRandomPosition(150, prevDevices?.map((d) => d.position), 50),
            scale: new Animated.Value(0)
          };

          Animated.timing(newDevice.scale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();

          return [...prevDevices, newDevice]
        }

        return prevDevices;
      })
    })
  }

  useEffect(() => {
    let udpServer:any;
    const setupServer = async() => {
      udpServer = await listenForDevices()
    }
    setupServer();
  
    return () => {
      if(udpServer) {
        udpServer.close(() => {
          console.log("UDP Server closed")
        });
      }
      setnearbyDevices([]);
    }
  }, [])
  

  const handleGoBack=()=>{
    goBack();
  }

  useEffect(() => {
    if(isConnected){
      navigate("ConnectionScreen")
    }

  }, [isConnected])

  const getRandomPosition=(radius:number, existingPositions:{x:number, y:number}[], minDistance: number) => {
    let position:any;
    let isOverlapping;

    do{
      const angle = Math.random() * 360;
      const distance = Math.random() * (radius - 50)+50;
      const x = distance * Math.cos((angle + Math.PI) / 180)
      const y = distance * Math.sin((angle + Math.PI) / 180)

      position  = {x,y}
      isOverlapping = existingPositions.some((pos) => {
        const dx = pos.x - position.x;
        const dy = pos.y - position.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance
      })
    } while(isOverlapping)

    return position;
  }
  
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     if(nearbyDevices.length < deviceNames.length) {
  //       const newDevice = {
  //         id: `${nearbyDevices.length+1}`,
  //         name: deviceNames[nearbyDevices.length],
  //         image: require('../assets/icons/device.jpeg'),
  //         position: getRandomPosition(150, nearbyDevices.map((d) => d.position), 50),
  //         scale: new Animated.Value(0)
  //       };

  //       setnearbyDevices((prevDevices) => [...prevDevices, newDevice]);

  //       Animated.timing(newDevice.scale, {
  //         toValue: 1,
  //         duration: 500,
  //         easing: Easing.out(Easing.ease),
  //         useNativeDriver: true,
  //       }).start();
  //     } else {
  //       clearInterval(timer);
  //     }
  //   }, 2000)
  
  //   return () => clearInterval(timer)

  // }, [nearbyDevices])
  


  return (
    <LinearGradient
      colors={['#FFFFFF','#B689ED','#A066E5']}
      style={sendStyles.container}
      start={{x:0,y:1}}
      end={{x:0, y:0}}
    >
      <SafeAreaView/>

        <View style={sendStyles.mainContainer}>
          <View style={sendStyles.infoContainer}>
            <Icon name='search' iconFamily='Ionicons' color='#fff' size={40}/>

            <CustomText fontFamily='Okra-Bold' color='#fff' fontSize={16} style={{marginTop: 20}}>
              Looking for nearby devices
            </CustomText>

            <CustomText fontFamily='Okra-Medium' color='#fff' fontSize={12} style={{textAlign: 'center'}}>
              Ensure your device's hotspot is active and the receiver device is connected to it.
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
                source={require('../assets/animations/scanner.json')}
                autoPlay
                loop={true}
                hardwareAccelerationAndroid
              />
              {
                nearbyDevices?.map((device) => (
                  <Animated.View
                    key={device?.id}
                    style={[
                      sendStyles.deviceDot,
                      {
                        transform: [{scale: device.scale}],
                        left: screenWidth / 2.33 + device.position?.x,
                        top: screenWidth / 2.33 + device.position?.y,
                      }
                    ]}
                  >
                    <TouchableOpacity style={sendStyles.popup} onPress={() => handleScan(device?.fullAddress)}>
                      <Image source={device.image} style={sendStyles.deviceImage}/>
                      <CustomText
                        numberOfLines={1}
                        color='#333'
                        fontFamily='Okra-Bold'
                        fontSize={8}
                        style={sendStyles.deviceText}
                      >
                        {device.name}
                      </CustomText>
                    </TouchableOpacity>

                  </Animated.View>
                ))
              }
            </View>

            <Image source={require('../assets/images/profile.jpg')} style={sendStyles.profileImage}/>
          </View>

          <TouchableOpacity onPress={handleGoBack} style={sendStyles.backButton}>
              <Icon name='arrow-back' iconFamily='Ionicons' size={16} color='#000'/>
          </TouchableOpacity>

          {
            isScannerVisible && (
              <QRScannerModal visible={isScannerVisible} onClose={() => setisScannerVisible(false)}/>
            )
          }

        </View>
    </LinearGradient>
  )
}
export default SendScreen