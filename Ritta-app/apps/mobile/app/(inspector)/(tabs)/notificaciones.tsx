import GlobalBackground from '@/components/layout/GlobalBackground';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  fetchInspectorPendingApprovals,
  resolveInspectorPendingApproval,
} from '@/services/withdrawals/inspector';
import { useFocusEffect } from 'expo-router';

interface InspectorApproval {
  id: number;
  requestedAt: string;
  notes?: string;
  student: {
    firstName: string;
    lastName: string;
    rut: string;
    courseName?: string;
  };
  delegate: {
    id?: number | null;
    name: string;
    phone?: string | null;
    rut?: string | null;
    relationshipToStudent?: string | null;
  };
  reason: {
    name: string;
    customReason?: string | null;
  };
  guardian?: {
    firstName: string;
    lastName: string;
  };
}

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InspectorNotificationsScreen() {
  const [approvals, setApprovals] = useState<InspectorApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadApprovals = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        const data = await fetchInspectorPendingApprovals();
        setApprovals(Array.isArray(data) ? data : []);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'No se pudieron cargar las solicitudes confirmadas');
      } finally {
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadApprovals(true);
      return undefined;
    }, [loadApprovals]),
  );

  const handleDecision = async (withdrawalId: number, action: 'APPROVE' | 'DENY') => {
    try {
      setActionId(withdrawalId);
      await resolveInspectorPendingApproval(withdrawalId, action);
      setApprovals(prev => prev.filter(item => item.id !== withdrawalId));
      Alert.alert(
        'Operación exitosa',
        action === 'APPROVE'
          ? 'El retiro ha sido marcado como autorizado.'
          : 'Has rechazado esta solicitud.',
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo completar la acción');
    } finally {
      setActionId(null);
    }
  };

  const confirmDecision = (withdrawalId: number, action: 'APPROVE' | 'DENY') => {
    const actionText = action === 'APPROVE' ? 'autorizar' : 'rechazar';
    Alert.alert(
      'Confirmar',
      ¿Deseas  este retiro?,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí', onPress: () => handleDecision(withdrawalId, action) },
      ],
      { cancelable: true },
    );
  };

  const renderCard = (item: InspectorApproval) => {
    const processing = actionId === item.id;
    return (
      <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between mb-2">
          <Text className="text-base font-semibold text-blue-700">
            {item.student.firstName} {item.student.lastName}
          </Text>
          <Text className="text-xs text-gray-500">{formatDate(item.requestedAt)}</Text>
        </View>

        <Text className="text-xs text-gray-500 mb-1">Curso: {item.student.courseName || 'Sin registro'}</Text>
        <Text className="text-xs text-gray-500 mb-1">RUT estudiante: {item.student.rut}</Text>

        <View className="mb-2 mt-2">
          <Text className="text-xs font-semibold text-gray-500">Delegado confirmado</Text>
          <Text className="text-sm text-gray-700">{item.delegate.name}</Text>
          {item.delegate.rut ? (
            <Text className=\"text-sm text-gray-500\">RUT: {item.delegate.rut}</Text>
          ) : null}
          <Text className="text-sm text-gray-500">Teléfono: {item.delegate.phone || 'No informado'}</Text>
          <Text className="text-sm text-gray-500">
            Relación: {item.delegate.relationshipToStudent || 'No informada'}
          </Text>
        </View>

        <View className="mb-2">
          <Text className="text-xs font-semibold text-gray-500">Motivo</Text>
          <Text className="text-sm text-gray-700">{item.reason.name}</Text>
          {item.reason.customReason ? (
            <Text className="text-sm text-gray-500">{item.reason.customReason}</Text>
          ) : null}
        </View>

        {item.guardian ? (
          <Text className="text-xs text-gray-400 mb-1">
            Confirmado por: {item.guardian.firstName} {item.guardian.lastName}
          </Text>
        ) : null}

        {item.notes ? (
          <View className="mb-3">
            <Text className="text-xs font-semibold text-gray-500">Notas</Text>
            <Text className="text-sm text-gray-600">{item.notes}</Text>
          </View>
        ) : null}

        <View className="flex-row space-x-3 mt-2">
          <TouchableOpacity
            className="flex-1 bg-green-600 py-3 rounded-xl"
            onPress={() => confirmDecision(item.id, 'APPROVE')}
            disabled={processing}
          >
            <Text className="text-center text-white font-semibold">Autorizar retiro</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-600 py-3 rounded-xl"
            onPress={() => confirmDecision(item.id, 'DENY')}
            disabled={processing}
          >
            <Text className="text-center text-white font-semibold">Rechazar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-3 text-gray-600">Cargando solicitudes confirmadas...</Text>
        </View>
      );
    }

    if (approvals.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-blue-700 mb-3">Sin confirmaciones</Text>
          <Text className="text-center text-gray-500">
            Cuando un apoderado apruebe un delegado extraordinario, verás la solicitud aquí para completar el retiro.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadApprovals(false)} />
        }
      >
        {approvals.map(renderCard)}
      </ScrollView>
    );
  };

  return <GlobalBackground>{renderContent()}</GlobalBackground>;
}

