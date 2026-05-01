export type TPermissionRequestKind =
  | 'ExecApprovalRequest'
  | 'ApplyPatchApprovalRequest'
  | 'RequestPermissions';

export type TPatchOperation = 'modify' | 'create' | 'delete';

export interface IExecApprovalRequest {
  type: 'ExecApprovalRequest';
  callId?: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface IPatchEntry {
  path: string;
  operation: TPatchOperation;
  diff?: string;
  content?: string;
}

export interface IApplyPatchApprovalRequest {
  type: 'ApplyPatchApprovalRequest';
  callId?: string;
  patches: IPatchEntry[];
}

export interface IRequestPermissions {
  type: 'RequestPermissions';
  callId?: string;
  permissions: string[];
}

export type IPermissionRequest =
  | IExecApprovalRequest
  | IApplyPatchApprovalRequest
  | IRequestPermissions;
