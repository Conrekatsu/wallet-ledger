export interface SerializedUser {
  id: string;
  email: string;
  apiKey?: string;
  name: string | null;
  createdAt: Date;
}

export interface SerializedUserWithPassword extends SerializedUser {
  password: string;
}

export class User {
  id: string;
  email: string;
  apiKey: string | null;
  password: string;
  name: string | null;
  createdAt: Date;

  constructor(data: {
    id: string;
    email: string;
    apiKey: string | null;
    password: string;
    name: string | null;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.apiKey = data.apiKey;
    this.password = data.password;
    this.name = data.name;
    this.createdAt = data.createdAt;
  }

  static fromRow(row: {
    id: string;
    email: string;
    api_key_hash: string;
    password: string;
    name: string | null;
    created_at: Date;
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      apiKey: row.api_key_hash,
      password: row.password,
      name: row.name,
      createdAt: row.created_at,
    });
  }

  static fromSafeRow(row: {
    id: string;
    email: string;
    api_key?: string;
    name: string | null;
    created_at: Date;
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      apiKey: row.api_key ?? null,
      password: '',
      name: row.name,
      createdAt: row.created_at,
    });
  }

  serialize(): SerializedUser {
    return {
      id: this.id,
      email: this.email,
      ...(this.apiKey ? { apiKey: this.apiKey } : {}),
      name: this.name,
      createdAt: this.createdAt,
    };
  }

  serializeWithPassword(): SerializedUserWithPassword {
    return {
      ...this.serialize(),
      password: this.password,
    };
  }
}

export interface CreateUserInput {
  email: string;
  apiKey: string;
  password: string;
  name?: string | null;
}
