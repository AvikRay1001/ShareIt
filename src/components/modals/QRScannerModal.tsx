import React, { FC, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, TouchableOpacity } from 'react-native';
import { View, Text } from 'react-native'
import { modalStyles } from '../../styles/modalStyles';
import Icon from '../global/Icon';
import CustomText from '../global/CustomText';
import {Camera, CodeScanner, useCameraDevice} from 'react-native-vision-camera'
import  Animated, {Easing, useSharedValue, useAnimatedStyle, withRepeat, withTiming} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';



interface ModalProps {
    visible: boolean;
    onClose: () => void;
}


const QRScannerModal: FC<ModalProps> = ({visible, onClose}) => {
    const { connectedToServer, isConnected } = useTCP()
    const [loading, setloading] = useState(true)
    const [codeFound, setcodeFound] = useState(false)
    const [hasPermission, sethasPermission] = useState(false)
    const device = useCameraDevice('back') as any;
    const shimmerTranslateX = useSharedValue(-300);

    const shimmerStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shimmerTranslateX.value }]
    }))

    useEffect(() => {
      const checkPermission = async() => {
        const cameraPermission = await Camera.requestCameraPermission();
        sethasPermission(cameraPermission === 'granted');
      }

      checkPermission();

      if(visible) {
        setloading(true)
        const timer = setTimeout(() => setloading(false),400)
        return () => clearTimeout(timer)
      }
    }, [visible])
    

    useEffect(() => {
      shimmerTranslateX.value = withRepeat(
        withTiming(300, {duration: 1500, easing: Easing.linear}),
        -1,
        false
      )
    }, [shimmerTranslateX])

    const handleScan = (data:any) => {
      const [connectionData, deviceName] = data.replace('tcp://','').split('|');
      const [host,port] = connectionData?.split(":");
      //connect to server
      connectedToServer(host, parseInt(port, 10), deviceName)
    }

    
    const codeScanner = useMemo<CodeScanner>(() =>({
      codeTypes:['qr','codabar'],
      onCodeScanned:(codes)=>{
        if(codeFound){
          return
        }
        console.log(`Scanned ${codes?.length} codes!`)
        if(codes?.length > 0){
          const scannedData = codes[0].value;
          console.log(scannedData);
          setcodeFound(true)
          handleScan(scannedData)
        }
      }
    }),[codeFound])

    useEffect(() => {
      if(isConnected){
        onClose()
        navigate("ConnectionScreen")
      }
    
    }, [isConnected])
    

  return (
    <Modal
        animationType='slide'
        visible={visible}
        presentationStyle='formSheet'
        onRequestClose={onClose}
        onDismiss={onClose}
    >
      <View style={modalStyles.modalContainer}>
        <View style={modalStyles.qrContainer}>
            {
              loading ? (
                <View style={modalStyles.skeleton}>
                  <Animated.View style={[modalStyles.shimmerOverlay, shimmerStyle]}>
                    <LinearGradient
                      colors={['#f3f3f3', "#fff", "#f3f3f3"]}
                      start={{x:0, y:0}}
                      end={{x:1,y:0}}
                      style={modalStyles.shimmerGradient}
                    />
                  </Animated.View>
                </View>
              ) : (
                <>
                  {
                    (!device || !hasPermission) ? (
                      <View style={modalStyles.skeleton}>
                          <Image
                            source={require('../../assets/images/no_camera.png')}
                            style={modalStyles.noCameraImage}
                          />
                      </View>
                    ) : (
                      <View style={modalStyles.skeleton}>
                        <Camera
                          style={modalStyles.skeleton}
                          isActive={visible}
                          device={device}
                          codeScanner={codeScanner}
                        />
                      </View>
                    )
                  }
                </>
              )
            }
        </View>

        <View style={modalStyles.info}>
            <CustomText style={modalStyles.infoText1}>
                Ensure you're on the same Wi-Fi network.
            </CustomText>
            <CustomText style={modalStyles.infoText2}>
                Ask the receiver to show a QR code to connect and transfer files.
            </CustomText>
        </View>

        <ActivityIndicator size='small' color='#000' style={{alignSelf: 'center'}}/>

        <TouchableOpacity onPress={() => onClose()} style={modalStyles.closeButton}>
            <Icon name="close" iconFamily="Ionicons" size={24} color="#000"/>
        </TouchableOpacity>

      </View>
    </Modal>
  )
}
export default QRScannerModal

