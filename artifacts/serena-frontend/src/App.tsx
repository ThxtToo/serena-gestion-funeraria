import { useState, type FormEvent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, Clipboard, DoorOpen, Eye, EyeOff,
  KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UserPlus, Users, UserRound,
  BookOpen, Plus, Pencil, Power, Send, CalendarDays,
} from "lucide-react";
import {
  getGetAuthSessionQueryKey, getListEmployeesQueryKey,
  getListAdminServiceOfferingsQueryKey, getListPublicServiceOfferingsQueryKey,
  useChangePassword, useCreateEmployee, useGetAuthSession, useListEmployees,
  useLogin, useLogout, useSetEmployeeActive, useListPublicServiceOfferings,
  useListAdminServiceOfferings, useCreateServiceOffering, useUpdateServiceOffering,
  useCreateServiceRequest,
} from "@workspace/api-client-react";
import type {
  AuthenticatedSession, AuthenticatedUser, EmployeeCreateResult,
  ServiceOffering, ServiceRequestCreated,
} from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function isUnauthorized(error: unknown) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 401);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") return data.error;
  }
  return fallback;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function Brand() {
  return <span className="brand" aria-label="Serena">
    <span className="brand-mark" aria-hidden="true">S</span>
    <span className="brand-word"><strong>serena</strong><small>ESPACIO DE EQUIPO</small></span>
  </span>;
}

function AuthAside() {
  return <aside className="auth-aside">
    <Brand />
    <div className="aside-copy">
      <span className="aside-kicker">ESPACIO PRIVADO · PERSONAL SERENA</span>
      <h1>El trabajo bien cuidado empieza <em>en equipo.</em></h1>
      <p>Un espacio interno para organizar el trabajo diario con claridad, respeto y responsabilidad.</p>
    </div>
    <div className="aside-foot">Acceso exclusivo para personal invitado</div>
  </aside>;
}

function AuthLoading() {
  return <div className="auth-layout" aria-label="Cargando sesión">
    <AuthAside />
    <main className="auth-main"><div className="auth-card">
      <div className="skeleton" style={{ width: 92 }} />
      <div className="skeleton" style={{ width: 220, height: 27, marginTop: 24 }} />
      <div className="skeleton" style={{ width: "86%", marginTop: 24 }} />
      <div className="skeleton" style={{ width: "100%", height: 46, marginTop: 33 }} />
      <div className="skeleton" style={{ width: "100%", height: 46, marginTop: 18 }} />
    </div></main>
  </div>;
}

function SignIn({ session }: { session: AuthenticatedSession | undefined }) {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  if (session) return <Redirect to={session.user.mustChangePassword ? "/change-password" : "/app"} />;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    login.mutate({ data: { email: email.trim(), password } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), data);
        setLocation(data.user.mustChangePassword ? "/change-password" : "/app");
      },
      onError: () => setError("No pudimos validar tus datos. Comprueba tu correo y contraseña e inténtalo de nuevo."),
    });
  };
  return <div className="auth-layout">
    <AuthAside />
    <main className="auth-main">
      <section className="auth-card">
        <p className="eyebrow" style={{ color: "var(--green)", margin: "0 0 13px" }}>INICIO DE SESIÓN</p>
        <h2>Qué bueno verte.</h2>
        <p className="auth-intro">Ingresa con la cuenta que te asignó la administración de Serena.</p>
        {error && <div className="form-alert" role="alert" data-testid="status-login-error"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Correo de trabajo</label>
            <input id="email" data-testid="input-login-email" type="email" autoComplete="username" required maxLength={254} placeholder="nombre@serena.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrap">
              <input id="password" data-testid="input-login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} placeholder="Escribe tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="reveal-button" type="button" data-testid="button-toggle-login-password" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <button className="primary-btn" data-testid="button-submit-login" type="submit" disabled={login.isPending}>
            {login.isPending ? "Verificando acceso…" : <>Entrar a Serena <ArrowRight size={15} /></>}
          </button>
        </form>
        <div className="form-note"><ShieldCheck size={15} /><span>El acceso está reservado a personas invitadas. Las cuentas son administradas por Serena.</span></div>
      </section>
      <div className="auth-footer">SERENA · SISTEMA INTERNO</div>
    </main>
  </div>;
}

function PasswordChange({ session }: { session: AuthenticatedSession }) {
  const [, setLocation] = useLocation();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const firstLogin = session.user.mustChangePassword;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (newPassword.length < 12) {
      setError("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    changePassword.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: (user: AuthenticatedUser) => {
        queryClient.setQueryData(getGetAuthSessionQueryKey(), { ...session, user });
        setLocation("/app");
      },
      onError: () => setError("No pudimos actualizar la contraseña. Verifica la contraseña actual e inténtalo de nuevo."),
    });
  };
  return <div className="auth-layout">
    <AuthAside />
    <main className="auth-main">
      <section className="auth-card">
        <p className="eyebrow" style={{ color: "var(--green)", margin: "0 0 13px" }}>{firstLogin ? "PRIMER ACCESO" : "SEGURIDAD DE CUENTA"}</p>
        <h2>{firstLogin ? "Crea tu contraseña." : "Actualiza tu contraseña."}</h2>
        <p className="auth-intro">{firstLogin ? "Antes de continuar, reemplaza la contraseña temporal por una personal y segura." : "Elige una contraseña nueva para proteger el acceso a tu cuenta."}</p>
        {error && <div className="form-alert" role="alert" data-testid="status-password-error"><AlertCircle size={16} />{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="current-password">Contraseña actual</label>
            <input id="current-password" data-testid="input-current-password" type={showPasswords ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-password">Nueva contraseña</label>
            <input id="new-password" data-testid="input-new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirma la nueva contraseña</label>
            <div className="input-wrap">
              <input id="confirm-password" data-testid="input-confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              <button className="reveal-button" type="button" data-testid="button-toggle-password-visibility" aria-label={showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"} onClick={() => setShowPasswords(!showPasswords)}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <p className="password-criteria">Usa al menos 12 caracteres. No compartas tu contraseña con otras personas.</p>
          <button className="primary-btn" data-testid="button-submit-password" type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Guardando…" : <>Guardar contraseña <ArrowRight size={15} /></>}
          </button>
        </form>
        {!firstLogin && <div className="form-note"><LockKeyhole size={15} /><span>El cambio se aplicará a los próximos inicios de sesión.</span></div>}
      </section>
      <div className="auth-footer">SERENA · ACCESO PROTEGIDO</div>
    </main>
  </div>;
}

function WorkspaceShell({ session, children }: { session: AuthenticatedSession; children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const [logoutError, setLogoutError] = useState("");
  const user = session.user;
  const isAdmin = user.role === "administrador";
  const signOut = () => {
    setLogoutError("");
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetAuthSessionQueryKey() });
        queryClient.removeQueries({ queryKey: getListEmployeesQueryKey() });
        setLocation("/");
      },
      onError: () => setLogoutError("No pudimos cerrar la sesión. Comprueba tu conexión e inténtalo de nuevo."),
    });
  };
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/app" className="brand" data-testid="link-brand-home"><span className="brand-mark">S</span><span className="brand-word"><strong>serena</strong><small>ESPACIO DE EQUIPO</small></span></Link>
      <nav aria-label="Navegación del espacio">
        <div className="nav-label">Espacio de trabajo</div>
        <Link href="/app" className={`side-link ${location === "/app" ? "active" : ""}`} data-testid="link-workspace-home"><UserRound size={16} /><span>Inicio</span></Link>
        {isAdmin && <>
          <Link href="/admin/users" className={`side-link ${location === "/admin/users" ? "active" : ""}`} data-testid="link-admin-users"><Users size={16} /><span>Cuentas de equipo</span></Link>
          <Link href="/admin/service-offerings" className={`side-link ${location === "/admin/service-offerings" ? "active" : ""}`} data-testid="link-admin-service-offerings"><BookOpen size={16} /><span>Catálogo de servicios</span></Link>
        </>}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-mini">
          <span className="avatar-initials" data-testid="text-user-initials">{initials(user.fullName)}</span>
          <span className="user-mini-name"><strong data-testid="text-user-name">{user.fullName}</strong><small>{isAdmin ? "Administración" : "Personal Serena"}</small></span>
        </div>
        <button className="logout-btn" data-testid="button-logout" type="button" onClick={signOut} disabled={logout.isPending}>
          {logout.isPending ? <RefreshCw size={14} /> : <DoorOpen size={15} />}<span>{logout.isPending ? "Saliendo…" : "Cerrar sesión"}</span>
        </button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><span className="topbar-label">Serena / Personal</span><span className="topbar-date">ÁREA PRIVADA · ACCESO SEGURO</span></header>
      {logoutError && <div className="page-inline-error" role="alert" data-testid="status-logout-error">{logoutError}</div>}
      {children}
    </main>
  </div>;
}

function EmployeeHome({ session }: { session: AuthenticatedSession }) {
  const user = session.user;
  const admin = user.role === "administrador";
  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">ESPACIO DE TRABAJO</p>
      <h1 className="page-title" data-testid="text-welcome-title">Buen día, {user.fullName.split(" ")[0]}.</h1>
      <p className="page-subtitle">Has iniciado sesión en el espacio interno de Serena. Mantén tu información de acceso protegida y cierra sesión al terminar.</p>
      <div className="welcome-panel">
        <div className="welcome-text">
          <h2>Un equipo presente, un trabajo cuidadoso.</h2>
          <p>Este espacio está reservado para el personal de Serena. La administración de tu cuenta y permisos corresponde al equipo administrador.</p>
        </div>
        <span className="welcome-stamp" aria-hidden="true">S</span>
      </div>
      <div className="quick-row">
        <Link href="/change-password" className="quick-link" data-testid="link-change-password"><KeyRound size={17} /><span>Cambiar contraseña</span><ArrowRight size={14} /></Link>
        {admin && <Link href="/admin/users" className="quick-link" data-testid="link-manage-accounts"><Users size={17} /><span>Administrar cuentas</span><ArrowRight size={14} /></Link>}
      </div>
    </section>
  </WorkspaceShell>;
}

function LoadingEmployees() {
  return <div className="table-wrap" aria-label="Cargando cuentas" data-testid="status-employees-loading">
    {[1, 2, 3].map((row) => <div className="skeleton-row" key={row}><div><div className="skeleton" style={{ width: 135 }} /><div className="skeleton" style={{ width: 105 }} /></div><div className="skeleton" style={{ width: 73 }} /></div>)}
  </div>;
}

function CreateEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (result: EmployeeCreateResult) => void }) {
  const createEmployee = useCreateEmployee();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    createEmployee.mutate({ data: { fullName: fullName.trim(), email: email.trim() } }, {
      onSuccess: (result) => onCreated(result),
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.")),
    });
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !createEmployee.isPending) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <div className="modal-head"><div><h2 id="create-title">Invitar a una persona</h2><p>Se creará una cuenta de empleado con acceso inicial temporal.</p></div><button className="icon-button" type="button" data-testid="button-close-create" aria-label="Cerrar" onClick={onClose}><span aria-hidden="true">×</span></button></div>
      {error && <div className="page-inline-error" role="alert" data-testid="status-create-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="new-fullname">Nombre completo</label><input id="new-fullname" data-testid="input-employee-name" required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre y apellidos" /></div>
        <div className="field"><label htmlFor="new-email">Correo de trabajo</label><input id="new-email" data-testid="input-employee-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@serena.com" /></div>
        <div className="form-note"><ShieldCheck size={15} /><span>Las cuentas nuevas comienzan con el rol de empleado. La persona deberá cambiar su contraseña al iniciar sesión por primera vez.</span></div>
        <div className="modal-actions"><button className="quiet-btn" type="button" data-testid="button-cancel-create" onClick={onClose} disabled={createEmployee.isPending}>Cancelar</button><button className="secondary-btn" type="submit" data-testid="button-create-employee" disabled={createEmployee.isPending}>{createEmployee.isPending ? "Creando…" : <><UserPlus size={15} /> Crear cuenta</>}</button></div>
      </form>
    </section>
  </div>;
}

function TemporaryPasswordModal({ result, onClose }: { result: EmployeeCreateResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return <div className="modal-backdrop" role="presentation">
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="password-created-title">
      <div className="success-banner" data-testid="status-employee-created"><CheckCircle2 size={17} /><span>La cuenta de <strong>{result.employee.fullName}</strong> ya está creada.</span></div>
      <div className="modal-head"><div><h2 id="password-created-title">Contraseña temporal</h2><p>Compártela de forma segura con la persona invitada. Esta contraseña solo se muestra ahora.</p></div></div>
      <div className="temporary-box">
        <label>Acceso inicial</label>
        <div className="temporary-password" data-testid="text-temporary-password"><span>{result.temporaryPassword}</span><button className="temporary-copy" type="button" data-testid="button-copy-temporary-password" aria-label="Copiar contraseña temporal" onClick={copyPassword}>{copied ? <Check size={15} /> : <Clipboard size={15} />}</button></div>
      </div>
      <div className="modal-warning"><LockKeyhole size={15} /><span>Debe cambiar esta contraseña en su primer inicio de sesión. Al cerrar esta ventana, no volverá a mostrarse.</span></div>
      <div className="modal-actions"><button className="secondary-btn" type="button" data-testid="button-dismiss-temporary-password" onClick={onClose}>Entendido</button></div>
    </section>
  </div>;
}

function AdminUsers({ session }: { session: AuthenticatedSession }) {
  const employeesQuery = useListEmployees({ query: { queryKey: getListEmployeesQueryKey() } });
  const setActive = useSetEmployeeActive();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<EmployeeCreateResult | null>(null);
  const [actionError, setActionError] = useState("");
  const updateActive = (userId: string, isActive: boolean) => {
    setActionError("");
    setActive.mutate({ userId, data: { isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() }),
      onError: () => setActionError("No pudimos actualizar el estado de la cuenta. Inténtalo de nuevo."),
    });
  };
  const employees = employeesQuery.data?.employees ?? [];
  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">ADMINISTRACIÓN · PERSONAL</p>
      <h1 className="page-title">Cuentas de equipo.</h1>
      <p className="page-subtitle">Invita al personal y mantén el acceso de cada cuenta bajo control. Solo las personas administradoras pueden gestionar estas cuentas.</p>
      <div className="admin-actions">
        <div><h2 className="section-title">Personal Serena</h2><span style={{ color: "var(--muted)", fontSize: 10 }}>{employeesQuery.isLoading ? "Consultando cuentas…" : `${employees.length} ${employees.length === 1 ? "cuenta" : "cuentas"}`}</span></div>
        <button className="secondary-btn" type="button" data-testid="button-open-create-employee" onClick={() => setCreating(true)}><UserPlus size={15} /> Invitar personal</button>
      </div>
      {actionError && <div className="page-inline-error" role="alert" data-testid="status-account-action-error">{actionError}</div>}
      {employeesQuery.isLoading ? <LoadingEmployees /> : employeesQuery.isError ? <div className="error-state table-wrap" data-testid="status-employees-error"><span className="state-symbol"><AlertCircle size={17} /></span><div><strong>No se pudieron cargar las cuentas</strong><p>Comprueba tu conexión e inténtalo de nuevo.</p><button className="quiet-btn" style={{ marginTop: 15 }} data-testid="button-retry-employees" onClick={() => employeesQuery.refetch()}><RefreshCw size={14} /> Reintentar</button></div></div> : employees.length === 0 ? <div className="empty-state table-wrap" data-testid="status-employees-empty"><span className="state-symbol"><Users size={17} /></span><div><strong>El equipo empieza aquí</strong><p>Invita a la primera persona para darle acceso a Serena.</p></div></div> : <div className="table-wrap">
        <table className="employee-table">
          <thead><tr><th>Persona</th><th>Acceso</th><th>Cuenta</th><th>Último acceso</th><th>Acción</th></tr></thead>
          <tbody>
            {employees.map((employee) => <tr key={employee.id} data-testid={`row-employee-${employee.id}`}>
              <td><div className="employee-name"><strong>{employee.fullName}</strong><small>{employee.email}</small></div></td>
              <td>{employee.role === "administrador" ? "Administración" : "Empleado"}</td>
              <td><div style={{ display: "grid", gap: 5 }}><span className={`pill ${employee.isActive ? "active" : "inactive"}`} data-testid={`status-employee-${employee.id}`}>{employee.isActive ? "Activa" : "Desactivada"}</span>{employee.mustChangePassword && <span className="pill pending">Cambio pendiente</span>}</div></td>
              <td>{employee.lastLoginAt ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(employee.lastLoginAt)) : "Aún no ha ingresado"}</td>
              <td>{employee.id === session.user.id ? <span style={{ color: "#8b968f", fontSize: 10 }}>Tu cuenta</span> : <button className="table-action" type="button" data-testid={`button-toggle-active-${employee.id}`} disabled={setActive.isPending} onClick={() => updateActive(employee.id, !employee.isActive)}>{employee.isActive ? "Desactivar" : "Reactivar"}</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </section>
    {creating && <CreateEmployeeModal onClose={() => setCreating(false)} onCreated={(result) => {
      setCreating(false);
      setCreated(result);
      queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    }} />}
    {created && <TemporaryPasswordModal result={created} onClose={() => setCreated(null)} />}
  </WorkspaceShell>;
}



function PublicServiceRequest() {
  const offeringsQuery = useListPublicServiceOfferings();
  const createRequest = useCreateServiceRequest();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [serviceOfferingId, setServiceOfferingId] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ServiceRequestCreated | null>(null);
  const [error, setError] = useState("");

  const offerings = offeringsQuery.data?.serviceOfferings ?? [];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!serviceOfferingId) {
      setError("Selecciona el servicio que deseas solicitar.");
      return;
    }

    createRequest.mutate({
      data: {
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        serviceOfferingId,
        ...(requestedDate ? { requestedDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    }, {
      onSuccess: (response) => setResult(response),
      onError: (requestError) => setError(getErrorMessage(
        requestError,
        "No pudimos registrar tu solicitud. Comprueba los datos e inténtalo de nuevo.",
      )),
    });
  };

  return <div className="auth-layout public-request-layout">
    <AuthAside />
    <main className="auth-main public-request-main">
      <section className="auth-card public-request-card">
        <Brand />
        {result ? <>
          <span className="state-symbol"><CheckCircle2 size={18} /></span>
          <p className="page-kicker">SOLICITUD REGISTRADA</p>
          <h1 className="page-title">Gracias por contactar a Serena.</h1>
          <div className="success-banner" role="status">
            <CheckCircle2 size={18} />
            <span>{result.message}</span>
          </div>
          <div className="request-reference">
            <span>REFERENCIA DE SOLICITUD</span>
            <strong>{result.referenceCode}</strong>
            <small>Estado: pendiente de revisión</small>
          </div>
          <p className="auth-intro">El equipo revisará la información y se pondrá en contacto contigo. Esta solicitud no representa una confirmación de disponibilidad ni del servicio.</p>
          <button className="primary-btn" type="button" onClick={() => {
            setResult(null);
            setContactName("");
            setContactPhone("");
            setServiceOfferingId("");
            setRequestedDate("");
            setNotes("");
          }}>Registrar otra solicitud <ArrowRight size={15} /></button>
        </> : <>
          <p className="page-kicker">ATENCIÓN Y ACOMPAÑAMIENTO</p>
          <h1 className="page-title">Estamos aquí para ayudarte.</h1>
          <p className="auth-intro">Comparte tus datos y el servicio que necesitas. Nuestro equipo revisará tu solicitud y se comunicará contigo.</p>

          {error && <div className="page-inline-error" role="alert">{error}</div>}

          {offeringsQuery.isLoading ? <div className="loading-state">Cargando servicios disponibles…</div>
          : offeringsQuery.isError ? <div className="error-state">
              <strong>No pudimos cargar los servicios.</strong>
              <p>Comprueba tu conexión e inténtalo de nuevo.</p>
              <button className="quiet-btn" type="button" onClick={() => offeringsQuery.refetch()}>Reintentar</button>
            </div>
          : offerings.length === 0 ? <div className="empty-state">
              <strong>Catálogo temporalmente no disponible</strong>
              <p>En este momento no hay servicios publicados para solicitar.</p>
            </div>
          : <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="request-contact-name">Nombre completo</label>
                <input id="request-contact-name" required minLength={2} maxLength={120}
                  autoComplete="name" value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Nombre y apellidos" />
              </div>
              <div className="field">
                <label htmlFor="request-contact-phone">Teléfono de contacto</label>
                <input id="request-contact-phone" required minLength={5} maxLength={30}
                  type="tel" autoComplete="tel" value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="Número de teléfono" />
              </div>
              <div className="field">
                <label htmlFor="request-offering">Servicio que necesitas</label>
                <select id="request-offering" required value={serviceOfferingId}
                  onChange={(event) => setServiceOfferingId(event.target.value)}>
                  <option value="">Selecciona un servicio</option>
                  {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="request-date">Fecha de preferencia (opcional)</label>
                <input id="request-date" type="date" value={requestedDate}
                  onChange={(event) => setRequestedDate(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="request-notes">Información adicional (opcional)</label>
                <textarea id="request-notes" maxLength={1000} rows={4}
                  value={notes} onChange={(event) => setNotes(event.target.value)}
                  placeholder="Cuéntanos brevemente cómo podemos ayudarte." />
              </div>
              <div className="form-note"><ShieldCheck size={15} /><span>Tu solicitud será revisada por nuestro equipo. El envío no confirma la disponibilidad del servicio.</span></div>
              <button className="primary-btn" type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Enviando solicitud…" : <>Enviar solicitud <Send size={15} /></>}
              </button>
            </form>}
          <div className="public-request-footer"><Link href="/">Acceso para personal Serena</Link></div>
        </>}
      </section>
    </main>
  </div>;
}

function ServiceOfferingForm({
  offering, onClose, onSaved,
}: {
  offering?: ServiceOffering;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createOffering = useCreateServiceOffering();
  const updateOffering = useUpdateServiceOffering();
  const [name, setName] = useState(offering?.name ?? "");
  const [description, setDescription] = useState(offering?.description ?? "");
  const [error, setError] = useState("");
  const pending = createOffering.isPending || updateOffering.isPending;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const data = { name: name.trim(), description: description.trim() || null };
    const callbacks = {
      onSuccess: () => onSaved(),
      onError: (requestError: unknown) => setError(getErrorMessage(
        requestError,
        "No pudimos guardar el servicio. Comprueba si ya existe otro con ese nombre.",
      )),
    };
    if (offering) {
      updateOffering.mutate({ serviceOfferingId: offering.id, data }, callbacks);
    } else {
      createOffering.mutate({ data }, callbacks);
    }
  };

  return <div className="modal-backdrop" role="presentation"
    onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="offering-form-title">
      <div className="modal-head">
        <div><h2 id="offering-form-title">{offering ? "Editar servicio" : "Nuevo servicio"}</h2>
          <p>Los servicios activos estarán disponibles en el formulario público.</p></div>
        <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
      </div>
      {error && <div className="page-inline-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="offering-name">Nombre del servicio</label>
          <input id="offering-name" required minLength={2} maxLength={120}
            value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del servicio" />
        </div>
        <div className="field">
          <label htmlFor="offering-description">Descripción (opcional)</label>
          <textarea id="offering-description" rows={4} maxLength={1000}
            value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe brevemente el servicio." />
        </div>
        <div className="modal-actions">
          <button className="quiet-btn" type="button" onClick={onClose} disabled={pending}>Cancelar</button>
          <button className="secondary-btn" type="submit" disabled={pending}>
            {pending ? "Guardando…" : <><Check size={15} /> Guardar servicio</>}
          </button>
        </div>
      </form>
    </section>
  </div>;
}

function AdminServiceOfferings({ session }: { session: AuthenticatedSession }) {
  const offeringsQuery = useListAdminServiceOfferings();
  const updateOffering = useUpdateServiceOffering();
  const client = useQueryClient();
  const [editing, setEditing] = useState<ServiceOffering | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshCatalog = () => {
    client.invalidateQueries({ queryKey: getListAdminServiceOfferingsQueryKey() });
    client.invalidateQueries({ queryKey: getListPublicServiceOfferingsQueryKey() });
    setCreating(false);
    setEditing(null);
    setNotice("El catálogo se actualizó correctamente.");
    setError("");
  };

  const toggleActive = (offering: ServiceOffering) => {
    setError("");
    setNotice("");
    updateOffering.mutate({
      serviceOfferingId: offering.id,
      data: { isActive: !offering.isActive },
    }, {
      onSuccess: () => {
        client.invalidateQueries({ queryKey: getListAdminServiceOfferingsQueryKey() });
        client.invalidateQueries({ queryKey: getListPublicServiceOfferingsQueryKey() });
        setNotice(offering.isActive
          ? "El servicio se desactivó. Se conservarán las solicitudes históricas."
          : "El servicio volvió a estar disponible en el formulario público.");
      },
      onError: (requestError) => setError(getErrorMessage(
        requestError, "No pudimos cambiar el estado del servicio.",
      )),
    });
  };

  const offerings = offeringsQuery.data?.serviceOfferings ?? [];

  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">ADMINISTRACIÓN</p>
      <h1 className="page-title">Catálogo de servicios.</h1>
      <p className="page-subtitle">Administra los servicios que las personas pueden seleccionar al enviar una solicitud. Desactivar un servicio no elimina su historial.</p>

      <div className="admin-actions">
        <span className="catalog-count">{offerings.length} {offerings.length === 1 ? "servicio registrado" : "servicios registrados"}</span>
        <button className="secondary-btn" type="button" onClick={() => { setCreating(true); setNotice(""); }}>
          <Plus size={15} /> Nuevo servicio
        </button>
      </div>

      {notice && <div className="success-banner" role="status"><CheckCircle2 size={17} /><span>{notice}</span></div>}
      {error && <div className="page-inline-error" role="alert">{error}</div>}

      {offeringsQuery.isLoading ? <div className="loading-state">Cargando catálogo…</div>
      : offeringsQuery.isError ? <div className="error-state">
          <strong>No pudimos cargar el catálogo.</strong>
          <p>Comprueba tu sesión y vuelve a intentarlo.</p>
          <button className="quiet-btn" type="button" onClick={() => offeringsQuery.refetch()}>Reintentar</button>
        </div>
      : offerings.length === 0 ? <div className="empty-state">
          <strong>Aún no hay servicios</strong>
          <p>Crea el primer servicio para publicarlo en el formulario de solicitudes.</p>
        </div>
      : <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>Servicio</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>{offerings.map((offering) => <tr key={offering.id}>
              <td><strong>{offering.name}</strong></td>
              <td>{offering.description || "—"}</td>
              <td><span className={`pill ${offering.isActive ? "active" : "inactive"}`}>{offering.isActive ? "Activo" : "Inactivo"}</span></td>
              <td><div className="catalog-row-actions">
                <button className="quiet-btn" type="button" onClick={() => { setEditing(offering); setNotice(""); }} aria-label={`Editar ${offering.name}`}><Pencil size={14} /> Editar</button>
                <button className="quiet-btn" type="button" disabled={updateOffering.isPending}
                  onClick={() => toggleActive(offering)} aria-label={`${offering.isActive ? "Desactivar" : "Activar"} ${offering.name}`}>
                  <Power size={14} /> {offering.isActive ? "Desactivar" : "Activar"}
                </button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}

      <div className="catalog-public-link"><span>Formulario público de solicitudes</span><Link href="/solicitar-servicio">Ver formulario <ArrowRight size={14} /></Link></div>
    </section>
    {(creating || editing) && <ServiceOfferingForm
      offering={editing ?? undefined}
      onClose={() => { setCreating(false); setEditing(null); }}
      onSaved={refreshCatalog}
    />}
  </WorkspaceShell>;
}

function ProtectedRoute({ session, children, adminOnly = false }: { session: AuthenticatedSession; children: ReactNode; adminOnly?: boolean }) {
  if (session.user.mustChangePassword) {
    return <Redirect to="/change-password" />;
  }
  if (adminOnly && session.user.role !== "administrador") {
    return <Redirect to="/app" />;
  }
  return children;
}

function AppRoutes() {
  const [location] = useLocation();
  const sessionQuery = useGetAuthSession({ query: { queryKey: getGetAuthSessionQueryKey(), retry: false } });
  if (location === "/solicitar-servicio") return <PublicServiceRequest />;
  const unauthorized = isUnauthorized(sessionQuery.error);
  const session = unauthorized ? undefined : sessionQuery.data;
  if (sessionQuery.isLoading) return <AuthLoading />;
  if (sessionQuery.isError && !unauthorized) {
    return <div className="auth-layout"><AuthAside /><main className="auth-main"><section className="auth-card">
      <span className="state-symbol"><AlertCircle size={17} /></span><h2>No pudimos confirmar tu sesión.</h2><p className="auth-intro">Revisa tu conexión y vuelve a intentarlo.</p>
      <button className="primary-btn" data-testid="button-retry-session" onClick={() => sessionQuery.refetch()}><RefreshCw size={15} /> Reintentar</button>
    </section></main></div>;
  }
  return <Switch>
    <Route path="/"><SignIn session={session} /></Route>
    <Route path="/change-password">{session ? <PasswordChange session={session} /> : <Redirect to="/" />}</Route>
    <Route path="/app">{session ? <ProtectedRoute session={session}><EmployeeHome session={session} /></ProtectedRoute> : <Redirect to="/" />}</Route>
    <Route path="/admin/users">{session ? <ProtectedRoute session={session} adminOnly><AdminUsers session={session} /></ProtectedRoute> : <Redirect to="/" />}</Route>
    <Route path="/admin/service-offerings">{session ? <ProtectedRoute session={session} adminOnly><AdminServiceOfferings session={session} /></ProtectedRoute> : <Redirect to="/" />}</Route>
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><div className="app-root"><AppRoutes /></div></QueryClientProvider>;
}

export default App;
