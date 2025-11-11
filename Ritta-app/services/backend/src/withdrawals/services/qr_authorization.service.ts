import { QrAuthorization, Student, User, WithdrawalReason, Course, Withdrawal, Delegate, EmergencyContact } from '../../models';
import { Op, Transaction } from 'sequelize';
import { QrGeneratorUtil } from '../utils/qr_generator.util';
import { CreateQrAuthorizationData, ManualAuthorizationResponseDto, QrValidationInfoDto } from '../utils/withdrawal.types';
import { WITHDRAWAL_CONSTANTS } from '../utils/withdrawal.constants';

type DelegateInstance = InstanceType<typeof Delegate>;

export class QrAuthorizationService {
  /**
   * Crear una nueva autorización QR
   */
  async createQrAuthorization(
    data: CreateQrAuthorizationData,
    transaction?: Transaction
  ): Promise<{ qrCode: string; expiresAt: Date; qrAuthId: number }> {
    // Verificar que no hay QR activo para este estudiante
    const activeQr = await QrAuthorization.findOne({
      where: {
        studentId: data.studentId,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      transaction
    });

    if (activeQr) {
      throw new Error('Ya existe un código QR activo para este estudiante. Espere a que expire o sea utilizado.');
    }

    // Generar código único y fecha de expiración
    const qrCodeNumber = await QrGeneratorUtil.generateUniqueCode();
    const qrCodeString = QrGeneratorUtil.formatQrCode(qrCodeNumber);
    const expiresAt = QrGeneratorUtil.calculateExpirationTime();

    // Crear autorización QR
    const qrAuth = await QrAuthorization.create(
      {
        code: qrCodeString,
        studentId: data.studentId,
        generatedByUserId: data.parentUserId,
        reasonId: data.reasonId,
        expiresAt,
        customWithdrawalReason: data.customReason || null,
        isUsed: false
      },
      { transaction }
    );

    return {
      qrCode: qrCodeString,
      expiresAt,
      qrAuthId: qrAuth.id
    };
  }

  /**
   * Obtener información completa de un QR para validación
   */
  async getQrValidationInfo(qrCode: string): Promise<QrValidationInfoDto> {
    // Validar formato
    if (!QrGeneratorUtil.validateQrCodeFormat(qrCode)) {
      throw new Error('Formato de código QR inválido');
    }

    const qrAuth = await QrAuthorization.findOne({
      where: {
        code: qrCode,
        isUsed: false
      },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'parent',
              attributes: ['id', 'rut', 'firstName', 'lastName', 'phone']
            },
            {
              model: Course,
              as: 'course',
              attributes: ['name']
            }
          ]
        },
        {
          model: WithdrawalReason,
          as: 'reason',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'generatedByUser',
          attributes: ['id', 'rut', 'firstName', 'lastName', 'phone']
        }
      ]
    });

    if (!qrAuth) {
      throw new Error('Código QR no encontrado o ya utilizado');
    }

    const isExpired = QrGeneratorUtil.isExpired(qrAuth.expiresAt);

    return {
      student: {
        id: qrAuth.student!.id,
        rut: qrAuth.student!.rut,
        firstName: qrAuth.student!.firstName,
        lastName: qrAuth.student!.lastName,
        courseName: qrAuth.student!.course?.name || 'Sin curso asignado'
      },
      parent: {
        id: qrAuth.generatedByUser!.id,
        rut: qrAuth.generatedByUser!.rut,
        firstName: qrAuth.generatedByUser!.firstName,
        lastName: qrAuth.generatedByUser!.lastName,
        phone: qrAuth.generatedByUser!.phone,
        relationship: 'Apoderado principal'
      },
      reason: {
        id: qrAuth.reason!.id,
        name: qrAuth.reason!.name
      },
      customReason: qrAuth.customWithdrawalReason || undefined,
      expiresAt: qrAuth.expiresAt,
      generatedAt: qrAuth.createdAt!,
      isExpired
    };
  }

  /**
   * Marcar QR como usado
   */
  async markQrAsUsed(qrCode: string, transaction?: Transaction): Promise<InstanceType<typeof QrAuthorization>> {
    const qrAuth = await QrAuthorization.findOne({
      where: {
        code: qrCode,
        isUsed: false
      },
      transaction
    });

    if (!qrAuth) {
      throw new Error('Código QR no encontrado o ya utilizado');
    }

    if (QrGeneratorUtil.isExpired(qrAuth.expiresAt)) {
      throw new Error('El código QR ha expirado');
    }

    await qrAuth.update(
      {
        isUsed: true,
        updatedAt: new Date()
      },
      { transaction }
    );

    return qrAuth;
  }

  /**
   * Obtener QR activo de un estudiante
   */
  async getActiveQrForStudent(
    studentId: number,
    parentUserId: number
  ): Promise<{
    qrCode: string;
    expiresAt: Date;
    qrAuthId: number;
    minutesRemaining: number;
    student: { firstName: string; lastName: string };
    reason: { name: string };
    customReason: string | null;
  } | null> {
    const activeQr = await QrAuthorization.findOne({
      where: {
        studentId: studentId,
        generatedByUserId: parentUserId,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['firstName', 'lastName']
        },
        {
          model: WithdrawalReason,
          as: 'reason',
          attributes: ['name']
        }
      ]
    });

    if (!activeQr) {
      return null;
    }

    const now = new Date();
    const minutesRemaining = Math.max(0, Math.floor((activeQr.expiresAt.getTime() - now.getTime()) / (1000 * 60)));

    return {
      qrCode: activeQr.code,
      expiresAt: activeQr.expiresAt,
      qrAuthId: activeQr.id,
      minutesRemaining,
      student: {
        firstName: activeQr.student!.firstName,
        lastName: activeQr.student!.lastName
      },
      reason: {
        name: activeQr.reason!.name
      },
      customReason: activeQr.customWithdrawalReason
    };
  }

  /**
   * Listar todos los QRs activos del apoderado
   */
  async getActiveQrsForParent(parentUserId: number): Promise<
    Array<{
      qrAuthId: number;
      qrCode: string;
      student: { id: number; firstName: string; lastName: string };
      reason: { id: number; name: string };
      customReason: string | null;
      expiresAt: Date;
      minutesRemaining: number;
      createdAt: Date;
    }>
  > {
    const activeQrs = await QrAuthorization.findAll({
      where: {
        generatedByUserId: parentUserId,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: WithdrawalReason,
          as: 'reason',
          attributes: ['id', 'name']
        }
      ],
      order: [['expiresAt', 'ASC']]
    });

    return activeQrs.map((qr) => {
      const now = new Date();
      const minutesRemaining = Math.max(0, Math.floor((qr.expiresAt.getTime() - now.getTime()) / (1000 * 60)));

      return {
        qrAuthId: qr.id,
        qrCode: qr.code,
        student: {
          id: qr.student!.id,
          firstName: qr.student!.firstName,
          lastName: qr.student!.lastName
        },
        reason: {
          id: qr.reason!.id,
          name: qr.reason!.name
        },
        customReason: qr.customWithdrawalReason,
        expiresAt: qr.expiresAt,
        minutesRemaining,
        createdAt: qr.createdAt!
      };
    });
  }

  /**
   * Inspector autoriza retiro SIN QR
   */
  async authorizeWithoutQr(
    payload: {
      studentId: number;
      inspectorUserId: number;
      reasonId: number;
      customReason?: string;
      delegateId?: number;
      manualDelegate?: {
        name: string;
        rut: string;
        phone: string;
        relationshipToStudent: string;
      };
      discardedDelegateIds?: number[];
      unregisteredDelegateReason?: string;
      allowManualDelegateOverride?: boolean;
      manualDelegateOverrideReason?: string;
    },
    transaction?: Transaction
  ): Promise<ManualAuthorizationResponseDto> {
    const {
      studentId,
      inspectorUserId,
      reasonId,
      customReason,
      delegateId,
      manualDelegate,
      unregisteredDelegateReason,
      allowManualDelegateOverride,
      manualDelegateOverrideReason
    } = payload;

    const normalizedManualDelegateOverrideReason = manualDelegateOverrideReason?.trim() || '';
    const forceManualDelegate = Boolean(allowManualDelegateOverride);

    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: User,
          as: 'parent',
          attributes: ['id'],
          include: [
            {
              model: Delegate,
              as: 'delegates',
              attributes: ['id', 'name', 'phone', 'relationshipToStudent']
            }
          ]
        }
      ],
      transaction
    });

    if (!student) {
      throw new Error('Estudiante no encontrado para autorizacion manual');
    }

    const parent = student.parent;

    if (!parent) {
      throw new Error('El estudiante no tiene un apoderado asociado para autorizaciones manuales');
    }

    if (delegateId && manualDelegate) {
      throw new Error('Debe usar un delegado registrado o ingresar uno manual, no ambos');
    }

     if (forceManualDelegate && !manualDelegate) {
      throw new Error('No se puede forzar un delegado extraordinario sin proporcionar sus datos.');
    }
    const parentDelegates = (parent.delegates ?? []) as DelegateInstance[];

    const discardedDelegateIds = Array.isArray(payload.discardedDelegateIds)
      ? Array.from(new Set(payload.discardedDelegateIds.map((id) => Number(id)))).filter((id) => !Number.isNaN(id))
      : [];

    discardedDelegateIds.forEach((discardedId) => {
      const belongsToParent = parentDelegates.some((delegate) => delegate.id === discardedId);
      if (!belongsToParent) {
        throw new Error('Uno de los delegados descartados no pertenece al apoderado del estudiante');
      }
    });

    const discardedDelegateIdsSet = new Set(discardedDelegateIds);

    const availableDelegates = parentDelegates
      .filter((delegate) => !discardedDelegateIdsSet.has(delegate.id))
      .map((delegate) => ({
        id: delegate.id,
        name: delegate.name,
        phone: delegate.phone,
        relationshipToStudent: delegate.relationshipToStudent
      }));

    if (!delegateId && !manualDelegate) {
      if (availableDelegates.length > 0) {
        return {
          manualAuthorization: false,
          requiresDelegateSelection: true,
          availableDelegates,
          message: 'Selecciona un delegado registrado para continuar con la autorización manual.',
          discardedDelegateIds
        };
      }

      return {
        manualAuthorization: false,
        requiresDelegateSelection: false,
        allowManualDelegate: true,
        availableDelegates: [],
        message:
          'No hay delegados registrados disponibles. Debes ingresar un delegado extraordinario y registrar la razón correspondiente.',
        discardedDelegateIds
      };
    }

    let resolvedDelegateId: number | undefined;
    let pendingParentApproval = false;
    let emergencyContactId: number | undefined;

    if (delegateId) {
      if (discardedDelegateIdsSet.has(delegateId)) {
        throw new Error('El delegado seleccionado fue marcado como descartado. Actualiza la selección para continuar.');
      }
      const delegate = await Delegate.findByPk(delegateId, { transaction });

      if (!delegate) {
        throw new Error('Delegado seleccionado no encontrado');
      }

      if (delegate.parentUserId !== parent.id) {
        throw new Error('El delegado seleccionado no pertenece al apoderado del estudiante');
      }

      resolvedDelegateId = delegate.id;
    }

    const parentHasDelegates = parentDelegates.length > 0;
    const hasAvailableDelegates = availableDelegates.length > 0;

    if (manualDelegate) {
      if (parentHasDelegates && hasAvailableDelegates) {
        if (!forceManualDelegate) {
          throw new Error(
            'Existen delegados registrados disponibles. Selecciona uno o descártalos explícitamente para habilitar un delegado extraordinario.'
          );
        }

        if (!normalizedManualDelegateOverrideReason) {
          throw new Error(
            'Debes registrar una justificación para autorizar a un delegado extraordinario cuando existen delegados registrados disponibles.'
          );
        }
      }

       if (!forceManualDelegate && parentHasDelegates && !hasAvailableDelegates) {
        const allDiscarded = parentDelegates.every((delegate) => discardedDelegateIdsSet.has(delegate.id));
        if (!allDiscarded) {
          throw new Error('Debes descartar explícitamente a todos los delegados registrados antes de ingresar uno extraordinario.');
        }
      }
      pendingParentApproval = true;
      const emergencyContact = await EmergencyContact.create(
        {
          parentUserId: parent.id,
          name: manualDelegate.name,
          phone: manualDelegate.phone,
          relationship: manualDelegate.relationshipToStudent,
          isVerified: false,
          isTemporary: true,
          isSingleUse: true,
          singleUseConsumedAt: null
        },
        { transaction }
      );
      emergencyContactId = emergencyContact.id;
    }

    if (!manualDelegate && !resolvedDelegateId) {
      throw new Error('Debe seleccionar o registrar un delegado para el retiro manual');
    }

    // Si hay un QR activo, lo marcamos como usado y lo asociamos; si no, generamos un "QR" manual usado de inmediato.
    const activeQr = await QrAuthorization.findOne({
      where: {
        studentId,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() }
      },
      transaction
    });

    let qrAuthId: number;
    let hadActiveQr = false;
    let message = '';
    let qrCode = '';

    if (activeQr) {
      await activeQr.update(
        {
          isUsed: true,
          updatedAt: new Date(),
          assignedDelegateId: resolvedDelegateId ?? activeQr.assignedDelegateId
        },
        { transaction }
      );

      qrAuthId = activeQr.id;
      qrCode = activeQr.code;
      hadActiveQr = true;
      message = 'QR activo marcado como usado por inspector';
    } else {
      const qrCodeNumber = await QrGeneratorUtil.generateUniqueCode();
      const qrCodeString = QrGeneratorUtil.formatQrCode(qrCodeNumber);

      const qrAuth = await QrAuthorization.create(
        {
          code: qrCodeString,
          studentId,
          generatedByUserId: inspectorUserId, // generado por inspector para trazar la acción
          reasonId,
          expiresAt: new Date(), // expira inmediatamente (marca manual)
          customWithdrawalReason: customReason || null,
          isUsed: true,
          assignedDelegateId: resolvedDelegateId ?? null
        },
        { transaction }
      );

      qrAuthId = qrAuth.id;
      qrCode = qrCodeString;
      hadActiveQr = false;
      message = 'Autorización manual creada';
    }

    // Notas informativas
    const notesParts: string[] = [];
    if (discardedDelegateIds.length > 0) {
      const discardedNames = parentDelegates
        .filter((delegate) => discardedDelegateIdsSet.has(delegate.id))
        .map((delegate) => delegate.name)
        .join(', ');
      notesParts.push(`Delegados descartados: ${discardedNames}`);
    }
    if (manualDelegate && unregisteredDelegateReason) {
      notesParts.push(`Razón delegado no registrado: ${unregisteredDelegateReason}`);
    }
    if (manualDelegate && forceManualDelegate && parentHasDelegates && hasAvailableDelegates) {
      const overrideReasonText = normalizedManualDelegateOverrideReason || 'Sin motivo especificado';
      notesParts.push(
        `${WITHDRAWAL_CONSTANTS.NOTES.MANUAL_DELEGATE_OVERRIDE_PREFIX} ${overrideReasonText}`
      );
    }
    if (manualDelegate) {
      notesParts.push(
        `Delegado extraordinario: ${manualDelegate.name} (${manualDelegate.relationshipToStudent})`
      );
      notesParts.push(`Teléfono delegado: ${manualDelegate.phone}`);
      notesParts.push(`RUT delegado: ${manualDelegate.rut}`);
    }

    await Withdrawal.create(
      {
        qrAuthorizationId: qrAuthId,
        studentId,
        organizationApproverUserId: inspectorUserId,
        reasonId,
        method: WITHDRAWAL_CONSTANTS.WITHDRAWAL_METHOD.MANUAL,
        status: pendingParentApproval
          ? WITHDRAWAL_CONSTANTS.WITHDRAWAL_STATUS.PENDING
          : WITHDRAWAL_CONSTANTS.WITHDRAWAL_STATUS.APPROVED,
        contactVerified: !pendingParentApproval,
        retrieverUserId: null,
        retrieverDelegateId: resolvedDelegateId ?? null,
        retrieverEmergencyContactId: emergencyContactId ?? null,
        retrieverNameIfOther: manualDelegate ? manualDelegate.name : null,
        retrieverRutIfOther: manualDelegate ? manualDelegate.rut : null,
        retrieverRelationshipIfOther: manualDelegate ? manualDelegate.relationshipToStudent : null,
        customWithdrawalReason: customReason || null,
        notes: notesParts.length ? notesParts.join('\n') : null,
        withdrawalTime: new Date()
      },
      { transaction }
    );

    message = pendingParentApproval
      ? 'Autorización manual registrada y pendiente de aprobación del apoderado para el delegado no registrado'
      : 'Retiro manual registrado y autorizado';

    return {
      qrAuthId,
      qrCode,
      manualAuthorization: true,
      hadActiveQr,
      message,
      pendingParentApproval
    };
  }

  /**
   * Obtener historial completo de QRs/retiros del apoderado
   */
  async getParentWithdrawalHistory(
    parentUserId: number,
    options: {
      limit?: number;
      offset?: number;
      studentId?: number;
      includePending?: boolean;
    } = {}
  ): Promise<{
    withdrawals: Array<{
      id: number;
      qrCode: string;
      student: { id: number; firstName: string; lastName: string; courseName?: string };
      reason: { id: number; name: string };
      customReason: string | null;
      status: 'COMPLETED' | 'ACTIVE' | 'EXPIRED';
      createdAt: Date;
      usedAt?: Date;
      expiresAt: Date;
      isManualAuthorization: boolean;
    }>;
    total: number;
    summary: {
      totalCompleted: number;
      totalActive: number;
      totalExpired: number;
    };
  }> {
    const { limit = 20, offset = 0, studentId, includePending = true } = options;

    // Construir condiciones WHERE
    const whereConditions: any = {
      generatedByUserId: parentUserId
    };

    if (studentId) {
      whereConditions.studentId = studentId;
    }

    if (!includePending) {
      // Solo mostrar QRs usados o expirados
      whereConditions[Op.or] = [{ isUsed: true }, { expiresAt: { [Op.lte]: new Date() } }];
    }

    // Obtener QRs/retiros
    const { count, rows: qrAuths } = await QrAuthorization.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['name'],
              required: false
            }
          ]
        },
        {
          model: WithdrawalReason,
          as: 'reason',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Procesar datos
    const now = new Date();
    const withdrawals = qrAuths.map((qr) => {
      let status: 'COMPLETED' | 'ACTIVE' | 'EXPIRED';

      if (qr.isUsed) {
        status = 'COMPLETED';
      } else if (qr.expiresAt <= now) {
        status = 'EXPIRED';
      } else {
        status = 'ACTIVE';
      }

      return {
        id: qr.id,
        qrCode: qr.code,
        student: {
          id: qr.student!.id,
          firstName: qr.student!.firstName,
          lastName: qr.student!.lastName,
          courseName: qr.student!.course?.name
        },
        reason: {
          id: qr.reason!.id,
          name: qr.reason!.name
        },
        customReason: qr.customWithdrawalReason,
        status,
        createdAt: qr.createdAt!,
        usedAt: qr.isUsed ? qr.updatedAt : undefined,
        expiresAt: qr.expiresAt,
        isManualAuthorization: qr.expiresAt <= qr.createdAt! // Si expira inmediatamente, es manual
      };
    });

    // Calcular resumen
    const totalCompleted = withdrawals.filter((w) => w.status === 'COMPLETED').length;
    const totalActive = withdrawals.filter((w) => w.status === 'ACTIVE').length;
    const totalExpired = withdrawals.filter((w) => w.status === 'EXPIRED').length;

    return {
      withdrawals,
      total: count,
      summary: {
        totalCompleted,
        totalActive,
        totalExpired
      }
    };
  }

  /**
   * Obtener estadísticas del apoderado
   */
  async getParentWithdrawalStats(parentUserId: number): Promise<{
    thisMonth: {
      generated: number;
      completed: number;
      expired: number;
    };
    allTime: {
      generated: number;
      completed: number;
      successRate: number;
    };
    studentStats: Array<{
      studentId: number;
      studentName: string;
      totalWithdrawals: number;
      lastWithdrawal?: Date;
    }>;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Stats del mes actual
    const thisMonthQrs = await QrAuthorization.findAll({
      where: {
        generatedByUserId: parentUserId,
        createdAt: { [Op.gte]: firstDayOfMonth }
      }
    });

    const thisMonthGenerated = thisMonthQrs.length;
    const thisMonthCompleted = thisMonthQrs.filter((qr) => qr.isUsed).length;
    const thisMonthExpired = thisMonthQrs.filter((qr) => !qr.isUsed && qr.expiresAt <= now).length;

    // Stats de todos los tiempos
    const allTimeQrs = await QrAuthorization.findAll({
      where: { generatedByUserId: parentUserId }
    });

    const allTimeGenerated = allTimeQrs.length;
    const allTimeCompleted = allTimeQrs.filter((qr) => qr.isUsed).length;
    const successRate = allTimeGenerated > 0 ? (allTimeCompleted / allTimeGenerated) * 100 : 0;

    // Stats por estudiante
    const studentStatsRows = await QrAuthorization.findAll({
      where: { generatedByUserId: parentUserId },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Agrupar por estudiante
    const studentMap = new Map<
      number,
      {
        studentId: number;
        studentName: string;
        totalWithdrawals: number;
        lastWithdrawal?: Date;
      }
    >();

    studentStatsRows.forEach((qr) => {
      const studentId = qr.student!.id;
      const studentName = `${qr.student!.firstName} ${qr.student!.lastName}`;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName,
          totalWithdrawals: 0,
          lastWithdrawal: undefined
        });
      }

      const stats = studentMap.get(studentId)!;
      stats.totalWithdrawals++;

      if (qr.isUsed && (!stats.lastWithdrawal || qr.updatedAt! > stats.lastWithdrawal)) {
        stats.lastWithdrawal = qr.updatedAt!;
      }
    });

    return {
      thisMonth: {
        generated: thisMonthGenerated,
        completed: thisMonthCompleted,
        expired: thisMonthExpired
      },
      allTime: {
        generated: allTimeGenerated,
        completed: allTimeCompleted,
        successRate: Math.round(successRate)
      },
      studentStats: Array.from(studentMap.values())
    };
  }

  /**
   * Limpiar QRs expirados y no utilizados
   */
  async cleanExpiredQrs(): Promise<number> {
    const result = await QrAuthorization.destroy({
      where: {
        isUsed: false,
        expiresAt: { [Op.lt]: new Date() }
      }
    });

    return result;
  }
}

export default new QrAuthorizationService();
