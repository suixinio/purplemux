export interface IHistoryEntry {
  id: string;
  message: string;
  sentAt: string;
}

export interface IMessageHistoryFile {
  entries: IHistoryEntry[];
}

export interface IMessageHistoryResponse {
  entries: IHistoryEntry[];
}

export interface IMessageHistoryAddResponse {
  entry: IHistoryEntry;
}

export interface IMessageHistoryDeleteResponse {
  success: boolean;
}
