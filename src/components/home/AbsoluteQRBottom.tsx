import { View, Text, TouchableOpacity } from 'react-native'
import { bottomTabStyles } from '../../styles/bottomTabStyle'
import { navigate } from '../../utils/NavigationUtil'
import Icon from '../global/Icon'
import { useState } from 'react'
import QRScannerModal from '../modals/QRScannerModal'
const AbsoluteQRBottom = () => {

    const [isVisible, setisVisible] = useState(false);

  return (
    <>
        <View style={bottomTabStyles.container}>
          <TouchableOpacity onPress={() => navigate('ReceivedFileScreen')}>
            <Icon name='apps-sharp' iconFamily='Ionicons' color='#333' size={24}/>
          </TouchableOpacity>
          <TouchableOpacity style={bottomTabStyles.qrCode} onPress={() => setisVisible(true)}>
            <Icon name='qrcode-scan' iconFamily='MaterialCommunityIcons' color='#fff' size={24}/>
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name='beer-sharp' iconFamily='Ionicons' color='#333' size={24}/>
          </TouchableOpacity>
        </View>

        {isVisible && <QRScannerModal visible={isVisible} onClose={() => setisVisible(false)}/>}
    </>
  )
}
export default AbsoluteQRBottom