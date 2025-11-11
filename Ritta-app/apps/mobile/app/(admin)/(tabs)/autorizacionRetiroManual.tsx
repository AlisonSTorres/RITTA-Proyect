import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import GlobalBackground from '@/components/layout/GlobalBackground';
import PickupInfoCard from '@/components/ui/cards/PickupInfoCard';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import AlertModal from '@/components/ui/alerts/AlertModal';
import { router } from 'expo-router';
import { authorizeManualWithdrawal, ManualAuthorizationPayload } from '@/services/withdrawals/inspector';

export default function ValidacionRetiroScreen() {
  const { data: pickupData, setData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Validación de datos completos
  if (
    !pickupData ||
    !pickupData.student ||
    !pickupData.authorizedParent ||
    !pickupData.withdrawalReason || 
    !pickupData.withdrawalReason.reasonName
  ) {
    return (
      <GlobalBackground>
        <View className="flex-1 justify-center items-center">
          <Text>Ha ocurrido un error, intentelo más tarde.</Text>
        </View>
      </GlobalBackground>
    );
  }

  const {
    student,
    authorizedParent,
    withdrawalReason,
    selectedDelegate,
    manualDelegate,
    unregisteredDelegateReason,
    allowManualDelegateOverride,
    manualDelegateOverrideReason,
  } = pickupData;

  const displayedReason = withdrawalReason.reasonName.startsWith('OTRO') 
    ? `${withdrawalReason.reasonName} - ${withdrawalReason.customReason}` 
    : withdrawalReason.reasonName;

  const displayedDelegate = manualDelegate || selectedDelegate || null;
  const delegateTitle = manualDelegate ? 'Delegado extraordinario' : 'Delegado registrado';
  const requiresParentApproval = Boolean(manualDelegate && !selectedDelegate);

  const handleAuthorization = async (status: string) => {
    if (!student?.id || !withdrawalReason?.reasonId) {
      setModalTitle('Error');
      setModalMessage('Faltan datos para autorizar el retiro.');
      setModalVisible(true);
      return;
    }

    const payload: ManualAuthorizationPayload = {
      studentId: student.id,
      reasonId: withdrawalReason.reasonId,
      customReason: withdrawalReason.reasonName.startsWith('OTRO')
        ? withdrawalReason.customReason || ''
        : '',
    };

    if (selectedDelegate?.id) {
      payload.delegateId = selectedDelegate.id;
    } else if (manualDelegate) {
      payload.manualDelegate = manualDelegate;
      if (unregisteredDelegateReason) {
        payload.unregisteredDelegateReason = unregisteredDelegateReason;
      }
      if (allowManualDelegateOverride) {
        payload.allowManualDelegateOverride = true;
        if (manualDelegateOverrideReason) {
          payload.manualDelegateOverrideReason = manualDelegateOverrideReason;
        }
      }
    }

    setLoading(true);

    try {
      const response = await authorizeManualWithdrawal(payload);
      const pendingApproval = Boolean(
        response?.pendingParentApproval ?? (!payload.delegateId && payload.manualDelegate)
      );

      if (status === 'authorized') {
        if (pendingApproval) {
          setModalTitle('Solicitud enviada');
          setModalMessage(
            'El retiro queda pendiente de autorización del apoderado. Se notificará cuando apruebe al delegado extraordinario.'
          );
        } else {
          setModalTitle('Autorización Exitosa');
          setModalMessage('El retiro ha sido autorizado correctamente, volviendo al menu principal.');
        }
      } else {
        setModalTitle('Operación Cancelada');
        setModalMessage('Se ha cancelado la operación, volviendo al menu principal.');
      }
      setModalVisible(true);

    } catch (error) {
      console.error('Error al autorizar el retiro:', error);
      setModalTitle('Error');
      setModalMessage('Hubo un error al autorizar el retiro, volviendo al menu principal.');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

// Redirigir al usuario a la pantalla de inicio después de cerrar el modal
  const handleModalClose = () => {
    router.push('/home');
    setData({});
    setLoading(false);
    setModalVisible(false); 
  };

  return (
    <GlobalBackground>
      <View className="flex-1 justify-center items-center px-5 max-w-[400px] mx-auto w-full">
        <Text className="text-xl font-bold text-blue-600 mb-4">Validación Retiro</Text>

        <View className="bg-white rounded-lg p-3 shadow-md w-full" style={{ maxHeight: 420 }}>
          <View className="items-center mb-1">
            <Ionicons name="warning" size={32} color="#facc15" />
          </View>

          <Text className="text-sm font-bold mb-2 text-center text-red-600">Información de retiro</Text>

           <ScrollView
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <Text className="text-sm mb-2 text-center">
              <Text className="font-bold">Motivo:</Text> {displayedReason}
            </Text>

            <View className="mb-3">
              <Text className="text-sm font-bold mb-1 text-red-600">Estudiante</Text>
              <PickupInfoCard
                name={`${student.firstName} ${student.lastName}`}
                rut={student.rut}
                grade={student.course?.name}
              />
            </View>

            {displayedDelegate && (
              <View className="mb-3">
                <Text className="text-sm font-bold mb-1 text-red-600">{delegateTitle}</Text>
                <PickupInfoCard
                  name={displayedDelegate.name}
                  rut={displayedDelegate.rut}
                  phone={displayedDelegate.phone || authorizedParent?.phone || undefined}
                  relation={displayedDelegate.relationshipToStudent}
                />
                {manualDelegate && (manualDelegateOverrideReason || unregisteredDelegateReason) ? (
                  <Text className="text-xs text-gray-600 mt-1">
                    <Text className="font-semibold">Razón delegado no registrado: </Text>
                    {manualDelegateOverrideReason || unregisteredDelegateReason}
                  </Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>

         <Text className="text-xs text-gray-500 text-center mt-2">
          (*) Solicitar autorización al operador para validar su identidad.
        </Text>
        {requiresParentApproval && (
          <Text className="text-xs text-gray-500 text-center mt-1">
            Enviar autorizacin notificar al apoderado para aprobar al delegado extraordinario antes de registrar el retiro.
          </Text>
        )}

        <View className="mt-2 flex-row space-x-2">
         <TouchableOpacity
            className="bg-green-600 py-2 px-4 rounded-lg"
            onPress={() => handleAuthorization('authorized')}
            disabled={loading}>
            <Text className="text-white font-medium">
              {requiresParentApproval ? 'Enviar autorizacin' : 'Autorizar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-600 py-2 px-4 rounded-lg"
            onPress={() => handleAuthorization('denied')}
            disabled={loading}
          >
            <Text className="text-white font-medium">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <AlertModal
        visible={modalVisible}
        title={modalTitle || 'Resultado'}
        message={modalMessage || 'Operación exitosa'}
        onClose={handleModalClose}
      />
    </GlobalBackground>
  );
}