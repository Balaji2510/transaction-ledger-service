export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface CreateAccountDTO {
  id?: string;
  name: string;
}

export interface AccountBalanceDTO {
  accountId: string;
  id: string;
  balance: number;
}

