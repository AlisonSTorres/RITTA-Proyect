import { EventEmitter } from 'events';
import { ManualApprovalAction } from '../withdrawals/utils/withdrawal.types';
import { WithdrawalStatus } from '../withdrawals/utils/withdrawal.constants';

export enum WithdrawalEvent {
  MANUAL_APPROVAL_RESOLVED = 'withdrawal.manualApproval.resolved'
}

export interface ManualApprovalResolvedEventPayload {
  withdrawalId: number;
  inspectorUserId: number;
  parentUserId: number;
  status: WithdrawalStatus;
  action: ManualApprovalAction;
  contactVerified: boolean;
  comment?: string;
  resolvedAt: Date;
}

class WithdrawalEventBus extends EventEmitter {}

export const withdrawalEventBus = new WithdrawalEventBus();

export type WithdrawalEventPayloadMap = {
  [WithdrawalEvent.MANUAL_APPROVAL_RESOLVED]: ManualApprovalResolvedEventPayload;
};

export default withdrawalEventBus;