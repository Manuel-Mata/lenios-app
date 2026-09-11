export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'cliente';
  createdAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  nombre: string;
  email: string;
  password: string;
  rol?: 'admin' | 'cliente';
}

export interface RespuestaAuth {
  success: boolean;
  message?: string;
  data?: {
    user: Usuario;
    tokens?: {
      accessToken: string;
      refreshToken?: string;
    };
    accessToken?: string;
  };
}
