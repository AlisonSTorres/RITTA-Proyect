import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import RutInput from '@/components/ui/input/RutInput';
import PrimaryButton from '@/components/ui/buttons/PrimaryButton';
import GlobalBackground from '@/components/layout/GlobalBackground';
import PickupInfoCard from '@/components/ui/cards/PickupInfoCard';
import { searchStudentByRut, getWithdrawalReasons } from '@/services/withdrawals/inspector';
import SelectOptionButton from '@/components/ui/buttons/SelectOptionButton';


type ManualDelegateForm = {
  name: string;
  rut: string;
  phone: string;
  relationshipToStudent: string;
};

const emptyManualDelegate: ManualDelegateForm = {
  name: '',
  rut: '',
  phone: '',
  relationshipToStudent: '',
};

export default function ManualEntryScreen() {
  const router = useRouter();
  const { setData } = useAppContext();
  const [rut, setRut] = useState('');
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [authorizedParent, setAuthorizedParent] = useState<any>(null);
  const [delegates, setDelegates] = useState<any[]>([]);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [reasons, setReasons] = useState<any[]>([]);
  const [loadingReasons, setLoadingReasons] = useState<boolean>(true);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [selectedDelegateId, setSelectedDelegateId] = useState<number | null>(null);
  const [showManualDelegateForm, setShowManualDelegateForm] = useState(false);
  const [manualDelegate, setManualDelegate] = useState<ManualDelegateForm>(emptyManualDelegate);
  const [unregisteredDelegateReason, setUnregisteredDelegateReason] = useState('');

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const reasonsData = await getWithdrawalReasons();
        if (reasonsData && Array.isArray(reasonsData)) {
          setReasons(reasonsData); // Asignamos los datos si todo es correcto
        } else {
          Alert.alert('Error', 'No se pudieron obtener los motivos de retiro');
          setReasons([]); // Limpiamos el estado si la respuesta no es correcta
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudieron obtener los motivos de retiro');
        setReasons([]); // Limpiamos el estado si hubo un error en la solicitud
      } finally {
        setLoadingReasons(false); // Cambiamos el estado de carga a false
      }
    };

    fetchReasons(); // Ejecutamos la llamada a la API al montar el componente

    // Cleanup cuando el componente se desmonte (limpiamos los estados)
    return () => {
     setRut('');
      setSelectedReasonId(null);
      setCustomReason('');
      setReasons([]);
      setStudentInfo(null);
      setAuthorizedParent(null);
      setDelegates([]);
      setSelectedDelegateId(null);
      setShowManualDelegateForm(false);
      setManualDelegate(emptyManualDelegate);
      setUnregisteredDelegateReason('');
    };
  }, []);

  const handleSelectReason = (id: number, name: string) => {
    setSelectedReasonId(id);
    if (name.startsWith('OTRO')) {
      setCustomReason('');
    } else {
      setCustomReason('');
    }
  };
  // Lógica para buscar el estudiante por RUT
  const handleSearchStudent = async () => {
    if (!rut.trim()) {
      Alert.alert('Error', 'Por favor ingrese el RUT del estudiante');
      return;
    }
      setSearchingStudent(true);
    try {
      const response = await searchStudentByRut(rut.trim());

      if (!response.success) {
        Alert.alert('Error', response.message || 'Estudiante no encontrado');
        setStudentInfo(null);
        setAuthorizedParent(null);
        setDelegates([]);
        return;
      }
      setStudentInfo(response.data.student);
      setAuthorizedParent(response.data.authorizedParent);
      setDelegates(response.data.authorizedParent?.delegates || []);
      setSelectedDelegateId(null);
      setShowManualDelegateForm(false);
      setManualDelegate(emptyManualDelegate);
      setUnregisteredDelegateReason('');
      

    } catch (error) {
      Alert.alert('Error', 'Hubo un error al buscar el estudiante');
      console.error('Error en la búsqueda del estudiante:', error);
      setStudentInfo(null);
      setAuthorizedParent(null);
      setDelegates([]);
    } finally {
      setSearchingStudent(false);
    }
  };

  // Lógica para seleccionar un motivo
  const handleSelectDelegate = (delegateId: number) => {
    setSelectedDelegateId(delegateId);
    if (showManualDelegateForm) {
      setShowManualDelegateForm(false);
      setManualDelegate(emptyManualDelegate);
      setUnregisteredDelegateReason('');
    }
  };

  // Validación para habilitar el botón "Continuar"
  const toggleManualDelegateForm = () => {
    setShowManualDelegateForm((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        setSelectedDelegateId(null);
      } else {
        setManualDelegate(emptyManualDelegate);
        setUnregisteredDelegateReason('');
      }
      return nextValue;
    });
  };

  const handleManualDelegateChange = <K extends keyof ManualDelegateForm>(field: K, value: ManualDelegateForm[K]) => {
    setManualDelegate((prev) => ({ ...prev, [field]: value }));
  };

  const requiresCustomReason = () => {
    if (!selectedReasonId) return false;
    const reason = reasons.find((item) => item.id === selectedReasonId);
    return reason?.name?.startsWith('OTRO') ?? false;
  };

  const isManualDelegateValid = () => {
    if (!showManualDelegateForm) return false;
    return (
      manualDelegate.name.trim() !== '' &&
      manualDelegate.rut.trim() !== '' &&
      manualDelegate.phone.trim() !== '' &&
      manualDelegate.relationshipToStudent.trim() !== '' &&
      unregisteredDelegateReason.trim() !== ''
    );
  };

  const hasDelegateSelection = () => {
    if (!studentInfo) return false;
    if (showManualDelegateForm) {
      return isManualDelegateValid();
    }
    return selectedDelegateId !== null;
  };

  const isContinueDisabled = () => {
    if (!studentInfo || !authorizedParent) return true;
    if (!selectedReasonId) return true;
    if (requiresCustomReason() && !customReason.trim()) return true;
    return !hasDelegateSelection();
  };

  const handleContinue = () => {
    if (!studentInfo || !authorizedParent) {
      Alert.alert('Error', 'Debe buscar y seleccionar un estudiante antes de continuar');
      return;
    }

    if (!selectedReasonId) {
      Alert.alert('Error', 'Seleccione un motivo de retiro');
      return;
    }

    const reason = reasons.find((item) => item.id === selectedReasonId);
    const isOtherReason = reason?.name?.startsWith('OTRO');

    if (isOtherReason && !customReason.trim()) {
      Alert.alert('Error', 'Debe especificar el motivo personalizado');
      return;
    }

    if (!hasDelegateSelection()) {
      Alert.alert('Error', 'Seleccione un delegado registrado o ingrese uno extraordinario con su razón');
      return;
    }

    const selectedDelegate = delegates.find((delegate) => delegate.id === selectedDelegateId) || null;
    const trimmedManualDelegate = showManualDelegateForm
      ? {
          name: manualDelegate.name.trim(),
          rut: manualDelegate.rut.trim(),
          phone: manualDelegate.phone.trim(),
          relationshipToStudent: manualDelegate.relationshipToStudent.trim(),
        }
      : null;

    const withdrawalData = {
      student: studentInfo,
      authorizedParent,
      withdrawalReason: {
        reasonId: selectedReasonId,
        reasonName: reason?.name || '',
        customReason: isOtherReason ? customReason.trim() : '',
      },
      selectedDelegate,
      manualDelegate: trimmedManualDelegate,
      unregisteredDelegateReason: showManualDelegateForm ? unregisteredDelegateReason.trim() : null,
      allowManualDelegateOverride: showManualDelegateForm && delegates.length > 0,
      manualDelegateOverrideReason: showManualDelegateForm && delegates.length > 0 ? unregisteredDelegateReason.trim() : null,
    };

    setData(withdrawalData);
    router.push('/autorizacionRetiroManual');
  };

  return (
    <GlobalBackground>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 items-center justify-start px-5 py-8">
            <Text className="text-2xl font-bold text-blue-700 mb-3">
              Retiro manual
              </Text>
            <Text className="text-gray-400 text-center mt-1 mb-6">
              Ingrese los siguientes datos para realizar la autorización
              </Text>

            {/* Sección de Inputs */}
            <View className="space-y-4 w-full">
               {/* Input de RUT */}
              <Text className="text-xs font-semibold text-gray-500 mb-1 ml-1">
                RUT
                </Text>
              <RutInput
                value={rut}
                onChangeText={setRut}
                placeholder="12.345.678-9"
                className="bg-white p-4 rounded-lg border border-gray-200"
              />

            {/* Mostrar las opciones de motivo de retiro */}
            <PrimaryButton
                title={searchingStudent ? 'Buscando…' : 'Buscar estudiante'}
                onPress={handleSearchStudent}
                disabled={searchingStudent || !rut.trim()}
              />

              <View className="mt-6 w-full">
                <Text className="text-xs font-semibold text-gray-500 mb-2">Motivos de Retiro</Text>
                {loadingReasons ? (
                  <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Array.isArray(reasons) && reasons.length > 0 ? (
                      reasons.map((reason) => (
                        <View key={reason.id} className="mr-4">
                          <SelectOptionButton
                            label={reason.name || 'Motivo no disponible'}
                            isSelected={selectedReasonId === reason.id}
                            onPress={() => handleSelectReason(reason.id, reason.name || 'Motivo desconocido')}
                          />
                        </View>
              
                    ))
                    ) : (
                      <Text className="text-gray-500">No hay motivos disponibles</Text>
                    )}
                  </ScrollView>
                )}
              </View>

             {requiresCustomReason() && (
                <View className="w-full mt-2">
                  <Text className="text-xs font-semibold text-gray-500 mb-1">Detalle del motivo</Text>
                  <TextInput
                    placeholder="Escriba el motivo aquí..."
                    value={customReason}
                    onChangeText={setCustomReason}
                    className="border border-gray-200 p-4 rounded-lg bg-white"
                    multiline
                  />
                </View>
              )}

               {studentInfo && (
                <View className="w-full mt-6">
                  <Text className="text-xs font-semibold text-gray-500 mb-2">Estudiante encontrado</Text>
                  <PickupInfoCard
                    name={`${studentInfo.firstName} ${studentInfo.lastName}`}
                    rut={studentInfo.rut}
                    grade={studentInfo.course?.name}
                  />

                  <View className="mt-4">
                    <Text className="text-xs font-semibold text-gray-500 mb-2">Delegados registrados</Text>
                    {delegates.length > 0 ? (
                      delegates.map((delegate) => {
                        const isSelected = selectedDelegateId === delegate.id;
                        return (
                          <TouchableOpacity
                            key={delegate.id}
                            className={`border rounded-lg p-4 mb-3 ${
                              isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                            }`}
                            onPress={() => handleSelectDelegate(delegate.id)}
                          >
                            <Text className="text-base font-semibold text-gray-800">{delegate.name}</Text>
                            {delegate.rut && (
                              <Text className="text-sm text-gray-600">RUT: {delegate.rut}</Text>
                            )}
                            {delegate.phone && (
                              <Text className="text-sm text-gray-600">Teléfono: {delegate.phone}</Text>
                            )}
                            {delegate.relationshipToStudent && (
                              <Text className="text-sm text-gray-600">
                                Relación: {delegate.relationshipToStudent}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text className="text-sm text-gray-500">
                        El apoderado no tiene delegados registrados.
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    className="mt-4 rounded-lg border border-dashed border-blue-500 p-3"
                    onPress={toggleManualDelegateForm}
                  >
                    <Text className="text-sm font-semibold text-blue-600 text-center">
                      {showManualDelegateForm ? 'Cancelar delegado extraordinario' : 'Agregar delegado extraordinario'}
                    </Text>
                  </TouchableOpacity>

                  {showManualDelegateForm && (
                    <View className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <Text className="text-sm font-semibold text-blue-700">
                        Datos del delegado extraordinario
                      </Text>
                      <TextInput
                        placeholder="Nombre completo"
                        value={manualDelegate.name}
                        onChangeText={(text) => handleManualDelegateChange('name', text)}
                        className="border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      />
                      <TextInput
                        placeholder="RUT"
                        value={manualDelegate.rut}
                        onChangeText={(text) => handleManualDelegateChange('rut', text)}
                        className="border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      />
                      <TextInput
                        placeholder="Teléfono"
                        value={manualDelegate.phone}
                        onChangeText={(text) => handleManualDelegateChange('phone', text)}
                        className="border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      />
                      <TextInput
                        placeholder="Parentesco"
                        value={manualDelegate.relationshipToStudent}
                        onChangeText={(text) => handleManualDelegateChange('relationshipToStudent', text)}
                        className="border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      />
                      <View className="mt-2">
                        <Text className="text-xs font-semibold text-gray-600 mb-1">
                          Razón delegado no registrado
                        </Text>
                        <TextInput
                          placeholder="Explique por qué se autoriza a un delegado no registrado"
                          value={unregisteredDelegateReason}
                          onChangeText={setUnregisteredDelegateReason}
                          className="border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          multiline
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View className="flex-1 justify-center items-center p-4">
                <View className="w-full">
                  <PrimaryButton
                    title="Continuar"
                     onPress={handleContinue}
                    disabled={isContinueDisabled()}
                  />
                </View>
              </View>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </GlobalBackground>
  );
}
