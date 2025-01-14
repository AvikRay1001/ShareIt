import { View, Text, StyleSheet, Image } from 'react-native'
import CustomText from '../global/CustomText'
import { commonStyles } from '../../styles/commonStyles'
const Misc = () => {
  return (
    <View style={styles.container}>
        <CustomText fontSize={15} fontFamily='Okra-Bold'>Explore</CustomText>

        <View style={commonStyles.flexRowBetween}>
            <CustomText fontFamily='Okra-Bold' style={styles.text} fontSize={22}>
                #1 World's Best File Sharing App
            </CustomText>
            <Image source={require('../../assets//icons/share_logo.jpg')} style={styles.image}/>
        </View>

        <CustomText fontFamily='Okra-Bold' style={styles.text2}>
            Developed by - AvikRay 
        </CustomText>
    </View>
  )
}

export default Misc


const styles = StyleSheet.create({
    container: {
        paddingVertical: 20
    },
    text: {
        opacity: 0.5,
        width: '60%'
    },
    text2: {
        opacity: 0.5,
        marginTop: 10
    },
    image: {
        resizeMode: "contain",
        height: 120,
        width: '35%'
    }
})