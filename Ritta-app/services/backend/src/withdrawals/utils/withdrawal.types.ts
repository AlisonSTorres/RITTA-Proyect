import { WithdrawalStatus, WithdrawalMethod } from './withdrawal.constants';

/**
 * DTO para generar código QR
 */
export interface GenerateQrRequestDto {
  studentId: number;
  reasonId: number;
  customReason?: string;
}

/**
 * Respuesta al generar código QR
 */
export interface GenerateQrResponseDto {
  qrCode: string;
  expiresAt: Date;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    courseName?: string;
  };
  reason: {
    id: number;
    name: string;
  };
  customReason?: string;
}

/**
 * DTO para validar código QR
 */
export interface ValidateQrRequestDto {
  qrCode: string;
  action: 'APPROVE' | 'DENY';
  notes?: string;
}

/**
 * DTO para retiro manual con RUTs
 */
export interface ManualWithdrawalRequestDto {
  studentRut: string;
  parentRut: string;
  reasonId: number;
  customReason?: string;
  notes?: string;
}

/**
 * Resultado de procesamiento de retiro
 */
export interface WithdrawalResultDto {
  id: number;
  status: WithdrawalStatus;
  method: WithdrawalMethod;
  withdrawalTime: Date;
  approver: {
    id: number;
    name: string;
  };
  student: {
    id: number;
    name: string;
    rut: string;
    courseName?: string;
  };
  reason: {
    id: number;
    name: string;
  };
  retriever?: {
    id: number;
    name: string;
    rut: string;
  };
  customReason?: string;
  notes?: string;
}

/**
 * DTO para información de validación de QR
 */
export interface QrValidationInfoDto {
  student: {
    id: number;
    rut: string;
    firstName: string;
    lastName: string;
    courseName: string;
  };
  parent: {
    id: number;
    rut: string;
    firstName: string;
    lastName: string;
    phone: string;
    relationship: string;
  };
  reason: {
    id: number;
    name: string;
  };
  customReason?: string;
  expiresAt: Date;
  generatedAt: Date;
  isExpired: boolean;
}

/**
 * Datos para crear autorización QR
 */
export interface CreateQrAuthorizationData {
  studentId: number;
  parentUserId: number;
  reasonId: number;
  customReason?: string;
}

/**
 * Datos internos para procesar retiro
 */
export interface ProcessWithdrawalData {
  studentId: number;
  inspectorUserId: number;
  reasonId: number;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  qrAuthorizationId?: number;
  retrieverUserId?: number;
  retrieverDelegateId?: number;
  retrieverNameIfOther?: string;
  retrieverRutIfOther?: string;
  retrieverRelationshipIfOther?: string;
  customReason?: string;
  notes?: string;
  unregisteredDelegateReason?: string;
  contactVerified?: boolean;
}

/**
 * DTO para autorización manual simplificada
 * - `delegateId` referencia a un delegado ya registrado
 * - `manualDelegate` permite adjuntar un delegado extraordinario junto con la razón
 */
export interface ManualAuthorizationRequestDto {
  studentId: number;
  approverId?: number;
  reasonId: number;
  customReason?: string;
  delegateId?: number;
  manualDelegate?: {
    name: string;
    rut: string;
    phone: string;
    relationshipToStudent: string;
  };
  /**
   * Razón obligatoria solo cuando se envía un delegado manual no registrado
   */
  unregisteredDelegateReason?: string;
}

/**
 * Respuesta de autorización manual
 */
export interface ManualAuthorizationResponseDto {
  qrAuthId: number;
  qrCode: string;
  manualAuthorization: true;
  hadActiveQr: boolean;
  message: string;
  pendingParentApproval?: boolean;
}

/**
 * DTO para filtros de historial
 */
export interface HistoryFiltersDto {
   studentId?: number;
  studentRut?: string;
  status?: string;
  method?: string;
  approverId?: number; 
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta de historial con paginación
 */
export interface HistoryResponseDto<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    currentPage: number;
    totalPages: number;
  };
}

/**
 * DTO para estadísticas del apoderado
 */
export interface ParentStatsDto {
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
}

/**
 * DTO para QR activo
 */
export interface ActiveQrDto {
  qrAuthId: number;
  qrCode: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  reason: {
    id: number;
    name: string;
  };
  customReason: string | null;
  expiresAt: Date;
  minutesRemaining: number;
  createdAt: Date;
}

/**
 * DTO para estudiante con información completa
 */
export interface StudentWithQrStatusDto {
  id: number;
  firstName: string;
  lastName: string;
  rut: string;
  courseName?: string;
  activeQr?: boolean;
  qrInfo?: {
    qrCode: string;
    expiresAt: Date;
    minutesRemaining: number;
  };
}

/**
 * DTO para motivos de retiro
 */
export interface WithdrawalReasonDto {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

export type ManualApprovalAction = 'APPROVE' | 'DENY';

export interface ManualApprovalDelegateDto {
  id?: number | null;
  name: string;
  phone?: string | null;
  rut?: string | null;
  relationshipToStudent?: string | null;
}

export interface PendingManualApprovalDto {
  id: number;
  requestedAt: Date;
  notes?: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    rut: string;
    courseName?: string;
  };
  delegate: ManualApprovalDelegateDto;
  reason: {
    id: number;
    name: string;
    customReason?: string | null;
  };
  inspector?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface InspectorManualApprovalDto {
  id: number;
  requestedAt: Date;
  notes?: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    rut: string;
    courseName?: string;
  };
  delegate: ManualApprovalDelegateDto;
  reason: {
    id: number;
    name: string;
    customReason?: string | null;
  };
  guardian?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface ManualApprovalResolutionDto {
  id: number;
  status: WithdrawalStatus;
  contactVerified: boolean;
  notes?: string;
}
