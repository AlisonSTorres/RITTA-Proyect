import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import GlobalBackground from '@/components/layout/GlobalBackground';
import TextInputField from '@/components/ui/input/TextInputField';
import PrimaryButton from '@/components/ui/buttons/PrimaryButton';
import SecondaryButton from '@/components/ui/buttons/SecondaryButton';
import SwitchToggle from '@/components/ui/input/SwitchToggle';
import SelectOptionButton from '@/components/ui/buttons/SelectOptionButton';
import { fetchParentStudents } from '@/services/withdrawals/parent';
import { useFiltersContext } from '@/context/FiltersContext';

export default function WithdrawalHistoryFiltersScreen() {
  const router = useRouter();
  const { setFilters } = useFiltersContext();

  const [students, setStudents] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [limit, setLimit] = useState<string>('20');
  const [offset, setOffset] = useState<string>('0');
  const [includePending, setIncludePending] = useState<boolean>(true);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const data = await fetchParentStudents();
        setStudents(data);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'No se pudieron cargar los estudiantes');
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, []);

  const handleApplyFilters = () => {
    setLoading(true);
    try {
      setFilters({
        studentId: selectedStudentId === null ? undefined : selectedStudentId,
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
        includePending,
      });
      router.push('/historialRetiros');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlobalBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexGrow: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1D4ED8', marginBottom: 8 }}>
              Filtros Historial de Retiros
            </Text>
            <Text style={{ color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
              Ingresa los filtros para obtener el historial de retiros
            </Text>

            {/* Selector de alumnos */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Alumno</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ marginRight: 16 }}>
                  <SelectOptionButton
                    label="Todos"
                    isSelected={selectedStudentId === null}
                    onPress={() => setSelectedStudentId(null)}
                  />
                </View>

                {loadingStudents ? (
                  <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Cargando alumnos...</Text>
                ) : (
                  students.map((student) => (
                    <View key={student.id} style={{ marginRight: 16 }}>
                      <SelectOptionButton
                        label={`${student.firstName} ${student.lastName}`}
                        isSelected={selectedStudentId === student.id}
                        onPress={() => setSelectedStudentId(student.id)}
                      />
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <TextInputField
              label="Límite"
              value={limit}
              onChangeText={setLimit}
              placeholder="Cantidad máxima de resultados"
              keyboardType="numeric"
            />

            <TextInputField
              label="Pagniación"
              value={offset}
              onChangeText={setOffset}
              placeholder="Desplazamiento para paginación"
              keyboardType="numeric"
            />

            <SwitchToggle
              label="Incluir retiros pendientes"
              value={includePending}
              onValueChange={setIncludePending}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <SecondaryButton title="Cancelar" onPress={() => router.back()} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <PrimaryButton
                  title={loading ? 'Aplicando...' : 'Aplicar Filtros'}
                  onPress={handleApplyFilters}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GlobalBackground>
  );
}
