import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Platform } from 'react-native';
import Navigation from './src/navigation/Navigation';
import { requestPhotoPermission } from './src/utils/Constants';
import { checkFilePermissions } from './src/utils/libraryHelpers';

const App = () => {

  useEffect(() => {
    requestPhotoPermission()
    checkFilePermissions(Platform.OS)
  }, [])
  

  return (
    <Navigation/>
  );
};

export default App;
