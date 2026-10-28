import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { AuditLogService } from '../../Servicios/audit-log.service';
import { AuthenticationToken } from '../../Servicios/autentication-token.service';

interface AuditLogEntry {
  _id: string;
  userName: string;
  userFullName?: string;
  module: string;
  action: string;
  detail?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  login: 'Inicio de sesión',
  login_failed: 'Inicio de sesión fallido',
};

@Component({
  selector: 'app-audit-log',
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.css'],
})
export class AuditLogComponent implements OnInit {
  logs: AuditLogEntry[] = [];
  total = 0;
  page = 1;
  limit = 20;
  isLoading = false;
  errorMessage = '';

  filterUserName = '';
  filterModule = '';
  filterAction = '';
  filterFromDate = '';
  filterToDate = '';

  constructor(
    private auditLogService: AuditLogService,
    private authenticationToken: AuthenticationToken,
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
  }

  loadLogs(page: number = 1): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.page = page;

    this.auditLogService.listLogs(this.buildHeaders(), {
      userName: this.filterUserName,
      module: this.filterModule,
      action: this.filterAction,
      fromDate: this.filterFromDate,
      toDate: this.filterToDate,
      page: this.page,
      limit: this.limit,
    }).subscribe({
      next: (result) => {
        this.logs = result?.items || [];
        this.total = result?.total || 0;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la auditoría.';
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    this.loadLogs(1);
  }

  clearFilters(): void {
    this.filterUserName = '';
    this.filterModule = '';
    this.filterAction = '';
    this.filterFromDate = '';
    this.filterToDate = '';
    this.loadLogs(1);
  }

  nextPage(): void {
    if (this.page * this.limit < this.total) {
      this.loadLogs(this.page + 1);
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.loadLogs(this.page - 1);
    }
  }

  actionLabel(action: string): string {
    return ACTION_LABELS[action] || action;
  }

  actionClass(action: string): string {
    return 'action-' + action;
  }
}
