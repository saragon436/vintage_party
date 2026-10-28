import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { UserService } from '../../Servicios/user.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';

interface AdminUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
  rol?: string;
  permissions: string[];
  status: boolean;
  createdAt?: string;
}

const PERMISSION_OPTIONS: { value: string; label: string }[] = [
  { value: 'customers', label: 'Cliente' },
  { value: 'inventory', label: 'Mobiliario' },
  { value: 'quotations', label: 'Cotizaciones' },
  { value: 'contracts', label: 'Contrato' },
  { value: 'calendar', label: 'Calendario y programación' },
  { value: 'weekly_stock', label: 'Ver mobiliario semanal' },
  { value: 'reports', label: 'Reportes' },
  { value: 'users', label: 'Gestionar usuarios' },
  { value: 'audit_logs', label: 'Ver auditoría' },
];

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  permissionOptions = PERMISSION_OPTIONS;
  isLoading = false;
  errorMessage = '';

  showCreateForm = false;
  isSubmitting = false;

  firstName = '';
  lastName = '';
  userName = '';
  password = '';
  rol = 'ADMIN';
  createPermissions: Record<string, boolean> = {};

  editingId: string | null = null;
  editRol = 'ADMIN';
  editStatus = true;
  editPermissions: Record<string, boolean> = {};

  constructor(
    private userService: UserService,
    private authenticationToken: AuthenticationToken,
    private confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.listUsers(this.buildHeaders()).subscribe({
      next: (data) => {
        this.users = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la lista de usuarios.';
        this.isLoading = false;
      },
    });
  }

  isSuperAdminUser(user: AdminUser): boolean {
    return user.rol === 'SUPER_ADMIN';
  }

  initials(user: AdminUser): string {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }

  permissionLabel(value: string): string {
    return this.permissionOptions.find((o) => o.value === value)?.label || value;
  }

  openCreateForm(): void {
    this.showCreateForm = true;
    this.firstName = '';
    this.lastName = '';
    this.userName = '';
    this.password = '';
    this.rol = 'ADMIN';
    this.createPermissions = {};
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    const permissions = Object.keys(this.createPermissions).filter((k) => this.createPermissions[k]);
    const body = {
      firstName: this.firstName,
      lastName: this.lastName,
      userName: this.userName,
      password: this.password,
      rol: this.rol,
      permissions,
    };

    this.userService.createUser(body, this.buildHeaders()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showCreateForm = false;
        this.loadUsers();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.status === 403
          ? 'No tienes permisos para crear usuarios.'
          : 'No se pudo crear el usuario. Verifica que los datos sean válidos (contraseña de al menos 8 caracteres).';
      },
    });
  }

  startEdit(user: AdminUser): void {
    this.editingId = user._id;
    this.editRol = user.rol || 'ADMIN';
    this.editStatus = user.status;
    this.editPermissions = {};
    (user.permissions || []).forEach((p) => (this.editPermissions[p] = true));
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  submitEdit(user: AdminUser): void {
    this.errorMessage = '';
    const permissions = Object.keys(this.editPermissions).filter((k) => this.editPermissions[k]);
    const body = { rol: this.editRol, permissions, status: this.editStatus };

    this.userService.updateUser(user._id, body, this.buildHeaders()).subscribe({
      next: () => {
        this.editingId = null;
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'No se pudo actualizar el usuario.';
      },
    });
  }

  async deleteUser(user: AdminUser): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(
      `¿Eliminar al usuario ${user.firstName} ${user.lastName}? Podrás reactivarlo luego desde "Editar".`,
      'Eliminar usuario'
    );
    if (!confirmed) return;

    this.errorMessage = '';
    this.userService.deleteUser(user._id, this.buildHeaders()).subscribe({
      next: () => this.loadUsers(),
      error: () => {
        this.errorMessage = 'No se pudo eliminar el usuario.';
      },
    });
  }
}
