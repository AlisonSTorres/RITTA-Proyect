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
  Platform,
} from 'react-native';
import {
  fetchPendingManualApprovals,
  resolveManualApprovalRequest,
} from '@/services/withdrawals/parent';
import { useFocusEffect } from 'expo-router';

type PendingApproval = {
  id: number;
  requestedAt: string;
  notes?: string;
  manualDelegateOverride?: boolean;
  manualDelegateOverrideReason?: string;
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
  inspector?: {
    firstName: string;
    lastName: string;
  };
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function NotificacionesScreen() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadApprovals = useCallback(
    async ({ showSpinner = false, silentOnError = false }: { showSpinner?: boolean; silentOnError?: boolean } = {}) => {
      let success = false;

      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await fetchPendingManualApprovals();
        setApprovals(Array.isArray(data) ? data : []);
        success = true;
      } catch (error: any) {
         if (!silentOnError) {
          const message = error?.message || 'No se pudieron cargar las solicitudes pendientes';
          Alert.alert('Error', message);
        }
      } finally {
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
      return success;
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadApprovals({ showSpinner: true });
      return undefined;
    }, [loadApprovals]),
  );

  const performDecision = async (withdrawalId: number, action: 'APPROVE' | 'DENY') => {
    try {
      setActionId(withdrawalId);
      await resolveManualApprovalRequest(withdrawalId, action);
      setApprovals(prev => prev.filter(item => item.id !== withdrawalId));
      const refreshed = await loadApprovals({ silentOnError: true });
      const baseMessage =
        action === 'APPROVE'
          ? 'Has aprobado al delegado extraordinario.'
            : 'Has rechazado la autorización solicitada.';
      const message = refreshed
        ? baseMessage
        : `${baseMessage} No se pudo actualizar la lista automáticamente, por favor refresca manualmente.`;

      Alert.alert('Operación exitosa', message);

    } catch (error: any) {
      const message = error?.message || 'No se pudo procesar tu respuesta.';
      Alert.alert('Error', message);
    } finally {
      setActionId(null);
    }
  };

  const confirmDecision = (withdrawalId: number, action: 'APPROVE' | 'DENY') => {
    const actionText = action === 'APPROVE' ? 'aprobar' : 'rechazar';
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm(`¿Deseas ${actionText} esta solicitud?`);
      if (confirmed) {
        void performDecision(withdrawalId, action);
      }
      return;
    }
    Alert.alert(
      'Confirmar',
      `¿Deseas ${actionText} esta solicitud?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí', onPress: () => void performDecision(withdrawalId, action) },
      ],
      { cancelable: true },
    );
  };

  const renderCard = (item: PendingApproval) => {
    const isProcessing = actionId === item.id;
    return (
      <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between mb-2">
          <Text className="text-base font-semibold text-blue-700">
            {item.student.firstName} {item.student.lastName}
          </Text>
          <Text className="text-xs text-gray-500">{formatDate(item.requestedAt)}</Text>
        </View>

        <View className="mb-2">
          <Text className="text-xs font-semibold text-gray-500">Curso</Text>
          <Text className="text-sm text-gray-700">{item.student.courseName || 'Sin registro'}</Text>
        </View>

        <View className="mb-2">
          <Text className="text-xs font-semibold text-gray-500">Delegado solicitado</Text>
          <Text className="text-sm text-gray-700">{item.delegate.name}</Text>
          {item.delegate.rut ? (
            <Text className="text-sm text-gray-500">RUT: {item.delegate.rut}</Text>
          ) : null}
          <Text className="text-sm text-gray-500">
            Teléfono: {item.delegate.phone || 'No informado'}
          </Text>
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

        {item.manualDelegateOverride ? (
          <View className="mb-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <Text className="text-xs font-semibold text-yellow-700">Delegado extraordinario forzado</Text>
            <Text className="text-sm text-yellow-700 mt-1">
              {item.manualDelegateOverrideReason
                ? item.manualDelegateOverrideReason
                : 'El inspector solicitó un delegado extraordinario a pesar de existir delegados registrados disponibles.'}
            </Text>
          </View>
        ) : null}
        {item.notes ? (
          <View className="mb-3">
            <Text className="text-xs font-semibold text-gray-500">Notas</Text>
            <Text className="text-sm text-gray-600">{item.notes}</Text>
          </View>
        ) : null}

        {item.inspector ? (
          <Text className="text-xs text-gray-400 mb-2">
            Inspector solicitante: {item.inspector.firstName} {item.inspector.lastName}
          </Text>
        ) : null}

        <View className="flex-row space-x-3 mt-2">
          <TouchableOpacity
            className="flex-1 bg-green-600 py-3 rounded-xl"
            onPress={() => confirmDecision(item.id, 'APPROVE')}
            disabled={isProcessing}
          >
            <Text className="text-center text-white font-semibold">Aprobar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-600 py-3 rounded-xl"
            onPress={() => confirmDecision(item.id, 'DENY')}
            disabled={isProcessing}
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
          <Text className="mt-3 text-gray-600">Cargando solicitudes pendientes...</Text>
        </View>
      );
    }

    if (approvals.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-blue-700 mb-3">Sin notificaciones</Text>
          <Text className="text-center text-gray-500">
            No tienes solicitudes de autorización pendientes. Cuando un inspector registre un delegado
            extraordinario aparecerá aquí para que confirmes la autorización.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
           <RefreshControl refreshing={refreshing} onRefresh={() => loadApprovals({})} />
        }
      >
        {approvals.map(renderCard)}
      </ScrollView>
    );
  };

  return <GlobalBackground>{renderContent()}</GlobalBackground>;
}
