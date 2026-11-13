import { useState, type FormEvent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, Clipboard, DoorOpen, Eye, EyeOff,
  KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UserPlus, Users, UserRound,
  BookOpen, Plus, Pencil, Power, Send, CalendarDays, ClipboardList, Package, Warehouse,
  MessageCircle,
} from "lucide-react";
import {
  getGetAuthSessionQueryKey, getListEmployeesQueryKey,
  getListAdminServiceOfferingsQueryKey, getListPublicServiceOfferingsQueryKey,
  useChangePassword, useCreateEmployee, useGetAuthSession, useListEmployees,
  useLogin, useLogout, useSetEmployeeActive, useListPublicServiceOfferings,
  useListAdminServiceOfferings, useCreateServiceOffering, useUpdateServiceOffering,
  useCreateServiceRequest, useListServiceRequests, useGetServiceRequestDetail,
  useUpdateServiceRequestStatus, getListServiceRequestsQueryKey,
  getGetServiceRequestDetailQueryKey,
  useListInventoryItems, getListInventoryItemsQueryKey, useCreateInventoryItem,
  useListInventoryMovements, getListInventoryMovementsQueryKey, useCreateInventoryMovement,
  useUpdateInventoryItem, useListResources, getListResourcesQueryKey,
  useCreateResource, useUpdateResource, useListRequestAssignments,
  getListRequestAssignmentsQueryKey, useCreateResourceAssignment, useCancelResourceAssignment,
  useAgentChat, useListContactChannels, getListContactChannelsQueryKey, useListPublicContactChannels,
  getListPublicContactChannelsQueryKey,
  useCreateContactChannel, useUpdateContactChannel,
} from "@workspace/api-client-react";
import type {
  AuthenticatedSession, AuthenticatedUser, EmployeeCreateResult,
  ServiceOffering, ServiceRequestCreated, ServiceRequestSummary,
  InventoryItem, Resource, ContactChannel,
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


function PublicHome() {
  const offeringsQuery = useListPublicServiceOfferings();
  const channelsQuery = useListPublicContactChannels({ query: { queryKey: getListPublicContactChannelsQueryKey() } });
  const offerings = offeringsQuery.data?.serviceOfferings ?? [];
  const channels = channelsQuery.data?.channels ?? [];

  return <div className="public-request-layout">
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "18px 20px" }}>
      <Brand />
      <Link href="/ingresar" className="quiet-btn" data-testid="link-staff-login"><LockKeyhole size={14} /> Acceso del personal</Link>
    </header>

    <main className="public-request-main">
      <p className="page-kicker">FUNERARIA SERENA</p>
      <h1 className="page-title">Acompañamos a la familia en el momento más difícil.</h1>
      <p className="page-subtitle">Organizamos el servicio con claridad y respeto: velación, traslado, sala y acompañamiento. Si necesitas orientación ahora, envíanos una solicitud y el equipo te contacta.</p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0 26px" }}>
        <Link href="/solicitar-servicio" className="primary-btn" style={{ width: "auto", textDecoration: "none" }} data-testid="link-request-service"><Send size={15} /> Solicitar un servicio</Link>
      </div>

      <h2 className="section-title">Servicios</h2>
      {offeringsQuery.isLoading ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Cargando servicios…</p>
      : offerings.length === 0 ? <p style={{ fontSize: 12, color: "var(--muted)" }}>El catálogo estará disponible en breve.</p>
      : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
          {offerings.map((offering) => <div key={offering.id} className="public-request-card" style={{ padding: 14 }}>
            <strong style={{ fontSize: 13 }}>{offering.name}</strong>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>{offering.description ?? "Consulta los detalles con el equipo."}</p>
          </div>)}
        </div>}

      <h2 className="section-title" style={{ marginTop: 26 }}>Atención humana</h2>
      {channels.length === 0 ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Los canales de contacto se publicarán pronto. Puedes enviar una solicitud desde el formulario.</p>
      : <ul style={{ listStyle: "none", padding: 0, margin: "10px 0", display: "grid", gap: 6 }}>
          {channels.map((channel) => <li key={channel.id} style={{ fontSize: 12 }}>
            <strong>{channel.label ?? "Contacto"}: </strong>{channel.value}
          </li>)}
        </ul>}
    </main>

    <footer className="public-request-footer" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span>SERENA · Gestión funeraria</span>
      <span style={{ opacity: 0.7 }}>Demostración académica con datos ficticios</span>
    </footer>
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
        <Link href="/app/solicitudes" className={`side-link ${location === "/app/solicitudes" ? "active" : ""}`} data-testid="link-staff-requests"><ClipboardList size={16} /><span>Solicitudes</span></Link>
        <Link href="/app/inventario" className={`side-link ${location === "/app/inventario" ? "active" : ""}`} data-testid="link-inventory"><Package size={16} /><span>Inventario</span></Link>
        <Link href="/app/recursos" className={`side-link ${location === "/app/recursos" ? "active" : ""}`} data-testid="link-resources"><Warehouse size={16} /><span>Recursos</span></Link>
        <Link href="/app/asistente" className={`side-link ${location === "/app/asistente" ? "active" : ""}`} data-testid="link-agent"><MessageCircle size={16} /><span>Asistente</span></Link>
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
      <p className="page-subtitle">Desde este espacio se revisan las solicitudes, se controla el inventario, se asignan recursos y se consulta al asistente. Todo con datos de demostración hasta que la funeraria valide el sistema.</p>
      <div className="welcome-panel">
        <div className="welcome-text">
          <h2>Un equipo presente, un trabajo cuidadoso.</h2>
          <p>Este espacio está reservado para el personal de Serena. La administración de tu cuenta y permisos corresponde al equipo administrador.</p>
        </div>
        <span className="welcome-stamp" aria-hidden="true">S</span>
      </div>
      <div className="quick-row">
        <Link href="/app/solicitudes" className="quick-link" data-testid="link-home-requests"><ClipboardList size={17} /><span>Solicitudes</span><ArrowRight size={14} /></Link>
        <Link href="/app/inventario" className="quick-link" data-testid="link-home-inventory"><Package size={17} /><span>Inventario</span><ArrowRight size={14} /></Link>
        <Link href="/app/recursos" className="quick-link" data-testid="link-home-resources"><Warehouse size={17} /><span>Recursos</span><ArrowRight size={14} /></Link>
        <Link href="/app/asistente" className="quick-link" data-testid="link-home-agent"><MessageCircle size={17} /><span>Asistente</span><ArrowRight size={14} /></Link>
        {admin && <Link href="/admin/users" className="quick-link" data-testid="link-manage-accounts"><Users size={17} /><span>Cuentas de equipo</span><ArrowRight size={14} /></Link>}
        {admin && <Link href="/admin/service-offerings" className="quick-link" data-testid="link-home-catalog"><BookOpen size={17} /><span>Catálogo de servicios</span><ArrowRight size={14} /></Link>}
        <Link href="/change-password" className="quick-link" data-testid="link-change-password"><KeyRound size={17} /><span>Cambiar contraseña</span><ArrowRight size={14} /></Link>
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


const REQUEST_STATUS_LABELS: Record<ServiceRequestSummary["status"], string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

const REQUEST_STATUS_TONES: Record<ServiceRequestSummary["status"], string> = {
  pendiente: "pending",
  en_revision: "pending",
  confirmada: "active",
  rechazada: "inactive",
  cancelada: "inactive",
};

type RequestStatusFilter = "todas" | ServiceRequestSummary["status"];

const REQUEST_STATUS_FILTERS: Array<{ value: RequestStatusFilter; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "en_revision", label: "En revisión" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "cancelada", label: "Canceladas" },
];

const REQUEST_TRANSITIONS: Record<
  ServiceRequestSummary["status"],
  Array<{ status: "en_revision" | "confirmada" | "rechazada" | "cancelada"; label: string; tone: "primary" | "secondary" | "danger" }>
> = {
  pendiente: [
    { status: "en_revision", label: "Pasar a revisión", tone: "primary" },
    { status: "cancelada", label: "Cancelar", tone: "danger" },
  ],
  en_revision: [
    { status: "confirmada", label: "Confirmar", tone: "primary" },
    { status: "rechazada", label: "Rechazar", tone: "danger" },
    { status: "cancelada", label: "Cancelar", tone: "danger" },
  ],
  confirmada: [{ status: "cancelada", label: "Cancelar", tone: "danger" }],
  rechazada: [],
  cancelada: [],
};

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusPill({ status }: { status: ServiceRequestSummary["status"] }) {
  return <span className={`pill ${REQUEST_STATUS_TONES[status]}`} data-testid={`status-request-${status}`}>{REQUEST_STATUS_LABELS[status]}</span>;
}

function ServiceRequestDetailPanel({
  serviceRequestId,
  canChangeStatus,
  onClose,
  onChanged,
}: {
  serviceRequestId: string;
  canChangeStatus: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const detailQuery = useGetServiceRequestDetail(serviceRequestId, {
    query: { queryKey: getGetServiceRequestDetailQueryKey(serviceRequestId) },
  });
  const updateStatus = useUpdateServiceRequestStatus();
  const [pendingReasonFor, setPendingReasonFor] = useState<"rechazada" | "cancelada" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyStatus = (status: "en_revision" | "confirmada" | "rechazada" | "cancelada", reasonText: string) => {
    setError("");
    setNotice("");
    updateStatus.mutate(
      { serviceRequestId, data: { status, ...(reasonText ? { reason: reasonText } : {}) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetServiceRequestDetailQueryKey(serviceRequestId) });
          setPendingReasonFor(null);
          setReason("");
          setNotice(`La solicitud quedó en estado "${REQUEST_STATUS_LABELS[status]}".`);
          onChanged();
        },
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos cambiar el estado de la solicitud.")),
      },
    );
  };

  if (detailQuery.isLoading) {
    return <div className="table-wrap"><div className="loading-state">Cargando solicitud…</div></div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div className="table-wrap error-state">
      <span className="state-symbol"><AlertCircle size={17} /></span>
      <div>
        <strong>No pudimos abrir la solicitud.</strong>
        <p>Comprueba tu sesión y vuelve a intentarlo.</p>
        <button className="quiet-btn" type="button" onClick={onClose}>Cerrar</button>
      </div>
    </div>;
  }

  const { serviceRequest, history } = detailQuery.data;
  const transitions = canChangeStatus ? REQUEST_TRANSITIONS[serviceRequest.status] : [];

  return <div className="table-wrap" data-testid="panel-request-detail" style={{ marginTop: 18 }}>
    <div className="admin-actions" style={{ marginBottom: 6 }}>
      <div>
        <span className="request-reference">{serviceRequest.referenceCode}</span>
        <h2 className="section-title" style={{ marginTop: 8 }}>{serviceRequest.serviceType}</h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StatusPill status={serviceRequest.status} />
        <button className="quiet-btn" type="button" onClick={onClose} data-testid="button-close-request-detail">Cerrar</button>
      </div>
    </div>

    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, margin: "16px 0" }}>
      <div><dt style={{ color: "var(--muted)", fontSize: 10 }}>Solicitante</dt><dd style={{ margin: "4px 0 0", fontSize: 12 }}>{serviceRequest.contactName}</dd></div>
      <div><dt style={{ color: "var(--muted)", fontSize: 10 }}>Teléfono</dt><dd style={{ margin: "4px 0 0", fontSize: 12 }}>{serviceRequest.contactPhone}</dd></div>
      <div><dt style={{ color: "var(--muted)", fontSize: 10 }}>Fecha deseada</dt><dd style={{ margin: "4px 0 0", fontSize: 12 }}>{formatShortDate(serviceRequest.requestedDate)}</dd></div>
      <div><dt style={{ color: "var(--muted)", fontSize: 10 }}>Recibida</dt><dd style={{ margin: "4px 0 0", fontSize: 12 }}>{formatDateTime(serviceRequest.createdAt)}</dd></div>
    </dl>

    {serviceRequest.notes && <p style={{ fontSize: 12, color: "var(--muted)" }}>{serviceRequest.notes}</p>}

    {notice && <div className="success-banner" role="status"><CheckCircle2 size={17} /><span>{notice}</span></div>}
    {error && <div className="page-inline-error" role="alert" data-testid="status-request-action-error">{error}</div>}

    {canChangeStatus && transitions.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "16px 0" }}>
      {transitions.map((transition) => <button
        key={transition.status}
        type="button"
        className={transition.tone === "danger" ? "danger-btn" : transition.tone === "primary" ? "primary-btn" : "secondary-btn"}
        style={{ width: "auto" }}
        disabled={updateStatus.isPending}
        data-testid={`button-request-status-${transition.status}`}
        onClick={() => {
          if (transition.status === "rechazada" || transition.status === "cancelada") {
            setPendingReasonFor(transition.status);
            setReason("");
            setNotice("");
          } else {
            applyStatus(transition.status, "");
          }
        }}
      >{transition.label}</button>)}
    </div>}

    {canChangeStatus && !REQUEST_TRANSITIONS[serviceRequest.status].length && <p className="form-note" style={{ fontSize: 11 }}>Esta solicitud está cerrada y no admite más cambios de estado.</p>}

    {pendingReasonFor && <div style={{ border: "1px solid var(--line, #dcd8cf)", padding: 14, marginBottom: 18 }}>
      <p style={{ fontSize: 12, marginTop: 0 }}>
        Motivo del {pendingReasonFor === "rechazada" ? "rechazo" : "cancelación"} (obligatorio)
      </p>
      <div className="field">
        <textarea
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          data-testid="input-request-status-reason"
        />
      </div>
      <div className="modal-actions">
        <button className="quiet-btn" type="button" onClick={() => { setPendingReasonFor(null); setReason(""); }}>Volver</button>
        <button
          className="danger-btn"
          type="button"
          disabled={updateStatus.isPending || reason.trim().length < 3}
          onClick={() => applyStatus(pendingReasonFor, reason.trim())}
          data-testid="button-confirm-request-status"
        >{updateStatus.isPending ? "Guardando…" : "Confirmar cambio"}</button>
      </div>
    </div>}

    <RequestAssignmentsPanel serviceRequestId={serviceRequest.id} suggestedDate={serviceRequest.requestedDate} />

    <h2 className="section-title" style={{ marginTop: 22 }}>Historial de estados</h2>
    <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 6px", display: "grid", gap: 12 }}>
      {history.map((entry) => <li key={entry.id} style={{ borderLeft: "2px solid var(--line, #dcd8cf)", paddingLeft: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 12 }}>{REQUEST_STATUS_LABELS[entry.newStatus]}</strong>
          <span style={{ color: "var(--muted)", fontSize: 10 }}>{formatDateTime(entry.createdAt)}</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>
          {entry.changedByName ? `Registrado por ${entry.changedByName}` : "Registro automático del sistema"}
        </p>
        {entry.reason && <p style={{ margin: "4px 0 0", fontSize: 11 }}>Motivo: {entry.reason}</p>}
      </li>)}
    </ol>
  </div>;
}

function StaffServiceRequests({ session }: { session: AuthenticatedSession }) {
  const [filter, setFilter] = useState<RequestStatusFilter>("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canChangeStatus = session.user.role === "administrador";
  const params = filter === "todas" ? undefined : { status: filter };
  const listQuery = useListServiceRequests(params, {
    query: { queryKey: getListServiceRequestsQueryKey(params) },
  });
  const requests = listQuery.data?.serviceRequests ?? [];
  const pendingCount = requests.filter((request) => request.status === "pendiente" || request.status === "en_revision").length;

  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">SOLICITUDES</p>
      <h1 className="page-title">Solicitudes recibidas.</h1>
      <p className="page-subtitle">Revisa las solicitudes del formulario público, cambia su estado y consulta el historial de cada una. Una solicitud recibida no está confirmada.</p>

      <div className="admin-actions">
        <span className="catalog-count">{listQuery.isLoading ? "Consultando…" : `${requests.length} ${requests.length === 1 ? "solicitud" : "solicitudes"}`}{pendingCount > 0 ? ` · ${pendingCount} por atender` : ""}</span>
        <button className="quiet-btn" type="button" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching} data-testid="button-refresh-requests"><RefreshCw size={14} /> Actualizar</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
        {REQUEST_STATUS_FILTERS.map((option) => <button
          key={option.value}
          type="button"
          className={filter === option.value ? "primary-btn" : "quiet-btn"}
          style={{ width: "auto", padding: "6px 12px", fontSize: 11 }}
          data-testid={`button-filter-requests-${option.value}`}
          onClick={() => setFilter(option.value)}
        >{option.label}</button>)}
      </div>

      {listQuery.isLoading ? <div className="table-wrap"><div className="loading-state">Cargando solicitudes…</div></div>
      : listQuery.isError ? <div className="table-wrap error-state">
          <span className="state-symbol"><AlertCircle size={17} /></span>
          <div><strong>No pudimos cargar las solicitudes.</strong><p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <button className="quiet-btn" style={{ marginTop: 15 }} type="button" onClick={() => listQuery.refetch()}><RefreshCw size={14} /> Reintentar</button>
          </div>
        </div>
      : requests.length === 0 ? <div className="table-wrap empty-state">
          <span className="state-symbol"><ClipboardList size={17} /></span>
          <div><strong>No hay solicitudes en esta vista</strong><p>Cuando alguien envíe el formulario público aparecerá aquí.</p></div>
        </div>
      : <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>Referencia</th><th>Servicio</th><th>Contacto</th><th>Estado</th><th>Recibida</th><th>Acción</th></tr></thead>
            <tbody>
              {requests.map((request) => <tr key={request.id} data-testid={`row-request-${request.referenceCode}`}>
                <td><span className="request-reference">{request.referenceCode}</span></td>
                <td><div className="employee-name"><strong>{request.serviceType}</strong><small>{formatShortDate(request.requestedDate)}</small></div></td>
                <td><div className="employee-name"><strong>{request.contactName}</strong><small>{request.contactPhone}</small></div></td>
                <td><StatusPill status={request.status} /></td>
                <td>{formatShortDate(request.createdAt)}</td>
                <td><button className="table-action" type="button" data-testid={`button-open-request-${request.referenceCode}`} onClick={() => setSelectedId(request.id)}>Ver</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>}

      {selectedId && <ServiceRequestDetailPanel
        serviceRequestId={selectedId}
        canChangeStatus={canChangeStatus}
        onClose={() => setSelectedId(null)}
        onChanged={() => listQuery.refetch()}
      />}
    </section>
  </WorkspaceShell>;
}


const INVENTORY_MOVEMENT_LABELS: Record<"entrada" | "salida" | "ajuste", string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

const RESOURCE_TYPE_LABELS: Record<Resource["type"], string> = {
  sala: "Sala",
  vehiculo: "Vehículo",
  equipo: "Equipo",
  otro: "Otro",
};

const RESOURCE_STATUS_LABELS: Record<Resource["status"], string> = {
  disponible: "Disponible",
  mantenimiento: "En mantenimiento",
  fuera_de_servicio: "Fuera de servicio",
};

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NewInventoryItemModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createItem = useCreateInventoryItem();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("unidad");
  const [minimumQuantity, setMinimumQuantity] = useState("0");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    createItem.mutate(
      {
        data: {
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          minimumQuantity: Number(minimumQuantity) || 0,
          initialQuantity: Number(initialQuantity) || 0,
        },
      },
      {
        onSuccess: onCreated,
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos crear el artículo.")),
      },
    );
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !createItem.isPending) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-item-title">
      <div className="modal-head"><div><h2 id="new-item-title">Nuevo artículo</h2><p>La existencia inicial queda registrada como una entrada en el historial.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><span aria-hidden="true">×</span></button></div>
      {error && <div className="page-inline-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="item-name">Nombre</label><input id="item-name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Cofre de madera" /></div>
        <div className="field"><label htmlFor="item-category">Categoría</label><input id="item-category" required minLength={2} maxLength={60} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Cofres" /></div>
        <div className="field"><label htmlFor="item-unit">Unidad de medida</label><input id="item-unit" required maxLength={30} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="unidad" /></div>
        <div className="field"><label htmlFor="item-minimum">Mínimo de referencia</label><input id="item-minimum" type="number" min={0} max={100000} value={minimumQuantity} onChange={(event) => setMinimumQuantity(event.target.value)} /></div>
        <div className="field"><label htmlFor="item-initial">Existencia inicial</label><input id="item-initial" type="number" min={0} max={100000} value={initialQuantity} onChange={(event) => setInitialQuantity(event.target.value)} /></div>
        <div className="modal-actions"><button className="quiet-btn" type="button" onClick={onClose} disabled={createItem.isPending}>Cancelar</button><button className="secondary-btn" type="submit" disabled={createItem.isPending}>{createItem.isPending ? "Guardando…" : "Crear artículo"}</button></div>
      </form>
    </section>
  </div>;
}

function InventoryMovementsPanel({ item, canAdjust, onClose }: { item: InventoryItem; canAdjust: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const movementsQuery = useListInventoryMovements(item.id, { query: { queryKey: getListInventoryMovementsQueryKey(item.id) } });
  const createMovement = useCreateInventoryMovement();
  const [type, setType] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    createMovement.mutate(
      { inventoryItemId: item.id, data: { type, quantity: Number(quantity) || 0, ...(reason.trim() ? { reason: reason.trim() } : {}) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey(item.id) });
          setNotice("Movimiento registrado.");
          setReason("");
          setQuantity("1");
        },
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos registrar el movimiento.")),
      },
    );
  };

  return <div className="table-wrap" style={{ marginTop: 18 }} data-testid="panel-inventory-movements">
    <div className="admin-actions" style={{ marginBottom: 10 }}>
      <div><h2 className="section-title">{item.name}</h2><span style={{ color: "var(--muted)", fontSize: 11 }}>{item.quantity} {item.unit} disponibles · mínimo {item.minimumQuantity}</span></div>
      <button className="quiet-btn" type="button" onClick={onClose}>Cerrar</button>
    </div>

    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <div className="field"><label htmlFor="movement-type">Tipo</label><select id="movement-type" value={type} onChange={(event) => setType(event.target.value as "entrada" | "salida" | "ajuste")}>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          {canAdjust && <option value="ajuste">Ajuste por conteo</option>}
        </select></div>
        <div className="field"><label htmlFor="movement-quantity">{type === "ajuste" ? "Existencia contada" : "Cantidad"}</label><input id="movement-quantity" type="number" min={type === "ajuste" ? 0 : 1} max={100000} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div>
      </div>
      <div className="field"><label htmlFor="movement-reason">Motivo {type === "ajuste" ? "(obligatorio)" : "(opcional)"}</label><input id="movement-reason" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Uso en servicio, conteo físico, compra…" /></div>
      {notice && <div className="success-banner" role="status"><CheckCircle2 size={17} /><span>{notice}</span></div>}
      {error && <div className="page-inline-error" role="alert">{error}</div>}
      <div className="modal-actions"><button className="secondary-btn" type="submit" disabled={createMovement.isPending}>{createMovement.isPending ? "Registrando…" : "Registrar movimiento"}</button></div>
    </form>

    <h3 className="section-title" style={{ marginTop: 18 }}>Movimientos</h3>
    {movementsQuery.isLoading ? <div className="loading-state">Cargando movimientos…</div>
    : (movementsQuery.data?.movements.length ?? 0) === 0 ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Sin movimientos registrados.</p>
    : <table className="employee-table">
        <thead><tr><th>Tipo</th><th>Cantidad</th><th>Antes</th><th>Después</th><th>Motivo</th><th>Fecha</th></tr></thead>
        <tbody>
          {movementsQuery.data?.movements.map((movement) => <tr key={movement.id}>
            <td>{INVENTORY_MOVEMENT_LABELS[movement.type]}</td>
            <td>{movement.quantity}</td>
            <td>{movement.previousQuantity}</td>
            <td>{movement.newQuantity}</td>
            <td>{movement.reason ?? "—"}</td>
            <td>{formatDateTime(movement.createdAt)}</td>
          </tr>)}
        </tbody>
      </table>}
  </div>;
}

function InventoryPage({ session }: { session: AuthenticatedSession }) {
  const queryClient = useQueryClient();
  const itemsQuery = useListInventoryItems({ query: { queryKey: getListInventoryItemsQueryKey() } });
  const updateItem = useUpdateInventoryItem();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [error, setError] = useState("");
  const canManage = session.user.role === "administrador";
  const items = itemsQuery.data?.items ?? [];
  const lowStock = items.filter((item) => item.lowStock && item.isActive).length;

  const toggleActive = (item: InventoryItem) => {
    setError("");
    updateItem.mutate({ inventoryItemId: item.id, data: { isActive: !item.isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() }),
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos actualizar el artículo.")),
    });
  };

  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">OPERACIÓN</p>
      <h1 className="page-title">Inventario.</h1>
      <p className="page-subtitle">Artículos que se controlan por cantidad. Cada entrada, salida o ajuste queda en el historial del artículo.</p>

      <div className="admin-actions">
        <span className="catalog-count">{items.length} {items.length === 1 ? "artículo" : "artículos"}{lowStock > 0 ? ` · ${lowStock} con existencia baja` : ""}</span>
        {canManage && <button className="secondary-btn" type="button" onClick={() => setCreating(true)}><Package size={15} /> Nuevo artículo</button>}
      </div>

      {error && <div className="page-inline-error" role="alert">{error}</div>}

      {itemsQuery.isLoading ? <div className="table-wrap"><div className="loading-state">Cargando inventario…</div></div>
      : itemsQuery.isError ? <div className="table-wrap error-state"><span className="state-symbol"><AlertCircle size={17} /></span><div><strong>No pudimos cargar el inventario.</strong><p>Comprueba tu sesión e inténtalo de nuevo.</p><button className="quiet-btn" style={{ marginTop: 15 }} type="button" onClick={() => itemsQuery.refetch()}><RefreshCw size={14} /> Reintentar</button></div></div>
      : items.length === 0 ? <div className="table-wrap empty-state"><span className="state-symbol"><Package size={17} /></span><div><strong>El inventario está vacío</strong><p>Registra el primer artículo para empezar a controlar existencias.</p></div></div>
      : <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>Artículo</th><th>Existencia</th><th>Mínimo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => <tr key={item.id}>
                <td><div className="employee-name"><strong>{item.name}</strong><small>{item.category}</small></div></td>
                <td>{item.quantity} {item.unit}</td>
                <td>{item.minimumQuantity}</td>
                <td style={{ display: "grid", gap: 5 }}>
                  <span className={`pill ${item.isActive ? "active" : "inactive"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
                  {item.isActive && item.lowStock && <span className="pill pending">Existencia baja</span>}
                </td>
                <td><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="table-action" type="button" onClick={() => setSelected(item)}>Movimientos</button>
                  {canManage && <button className="table-action" type="button" disabled={updateItem.isPending} onClick={() => toggleActive(item)}>{item.isActive ? "Desactivar" : "Reactivar"}</button>}
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </div>}

      {selected && <InventoryMovementsPanel item={selected} canAdjust={canManage} onClose={() => setSelected(null)} />}
    </section>
    {creating && <NewInventoryItemModal onClose={() => setCreating(false)} onCreated={() => {
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() });
    }} />}
  </WorkspaceShell>;
}

function NewResourceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createResource = useCreateResource();
  const [name, setName] = useState("");
  const [type, setType] = useState<Resource["type"]>("sala");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    createResource.mutate(
      { data: { name: name.trim(), type, ...(description.trim() ? { description: description.trim() } : {}) } },
      {
        onSuccess: onCreated,
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos crear el recurso.")),
      },
    );
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !createResource.isPending) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-resource-title">
      <div className="modal-head"><div><h2 id="new-resource-title">Nuevo recurso</h2><p>Salas, vehículos y equipos que se asignan a una solicitud.</p></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><span aria-hidden="true">×</span></button></div>
      {error && <div className="page-inline-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="resource-name">Nombre</label><input id="resource-name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sala A" /></div>
        <div className="field"><label htmlFor="resource-type">Tipo</label><select id="resource-type" value={type} onChange={(event) => setType(event.target.value as Resource["type"])}>
          <option value="sala">Sala</option>
          <option value="vehiculo">Vehículo</option>
          <option value="equipo">Equipo</option>
          <option value="otro">Otro</option>
        </select></div>
        <div className="field"><label htmlFor="resource-description">Descripción (opcional)</label><input id="resource-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="modal-actions"><button className="quiet-btn" type="button" onClick={onClose} disabled={createResource.isPending}>Cancelar</button><button className="secondary-btn" type="submit" disabled={createResource.isPending}>{createResource.isPending ? "Guardando…" : "Crear recurso"}</button></div>
      </form>
    </section>
  </div>;
}

function ResourcesPage({ session }: { session: AuthenticatedSession }) {
  const queryClient = useQueryClient();
  const resourcesQuery = useListResources(undefined, { query: { queryKey: getListResourcesQueryKey() } });
  const updateResource = useUpdateResource();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const canManage = session.user.role === "administrador";
  const resources = resourcesQuery.data?.resources ?? [];

  const changeStatus = (resource: Resource, status: Resource["status"]) => {
    setError("");
    updateResource.mutate({ resourceId: resource.id, data: { status } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() }),
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos actualizar el recurso.")),
    });
  };

  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">OPERACIÓN</p>
      <h1 className="page-title">Recursos.</h1>
      <p className="page-subtitle">Salas, vehículos y equipos. Un recurso solo puede asignarse a una solicitud si está disponible y su período no se superpone con otra asignación.</p>

      <div className="admin-actions">
        <span className="catalog-count">{resources.length} {resources.length === 1 ? "recurso" : "recursos"} · {resources.filter((resource) => resource.status === "disponible").length} disponibles</span>
        {canManage && <button className="secondary-btn" type="button" onClick={() => setCreating(true)}><Warehouse size={15} /> Nuevo recurso</button>}
      </div>

      {error && <div className="page-inline-error" role="alert">{error}</div>}

      {resourcesQuery.isLoading ? <div className="table-wrap"><div className="loading-state">Cargando recursos…</div></div>
      : resourcesQuery.isError ? <div className="table-wrap error-state"><span className="state-symbol"><AlertCircle size={17} /></span><div><strong>No pudimos cargar los recursos.</strong><p>Comprueba tu sesión e inténtalo de nuevo.</p></div></div>
      : resources.length === 0 ? <div className="table-wrap empty-state"><span className="state-symbol"><Warehouse size={17} /></span><div><strong>No hay recursos registrados</strong><p>Registra una sala o un vehículo para poder asignarlo a una solicitud.</p></div></div>
      : <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>Recurso</th><th>Tipo</th><th>Estado</th><th>Disponible</th><th>Acción</th></tr></thead>
            <tbody>
              {resources.map((resource) => <tr key={resource.id}>
                <td><div className="employee-name"><strong>{resource.name}</strong><small>{resource.description ?? "Sin descripción"}</small></div></td>
                <td>{RESOURCE_TYPE_LABELS[resource.type]}</td>
                <td>{RESOURCE_STATUS_LABELS[resource.status]}</td>
                <td><span className={`pill ${resource.available ? "active" : "inactive"}`}>{resource.available ? "Sí" : "No"}</span></td>
                <td>{canManage ? <select value={resource.status} onChange={(event) => changeStatus(resource, event.target.value as Resource["status"])} style={{ fontSize: 11 }}>
                  <option value="disponible">Disponible</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="fuera_de_servicio">Fuera de servicio</option>
                </select> : RESOURCE_STATUS_LABELS[resource.status]}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </section>
    {creating && <NewResourceModal onClose={() => setCreating(false)} onCreated={() => {
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
    }} />}
  </WorkspaceShell>;
}

function RequestAssignmentsPanel({ serviceRequestId, suggestedDate }: { serviceRequestId: string; suggestedDate?: string | null }) {
  const queryClient = useQueryClient();
  const assignmentsQuery = useListRequestAssignments(serviceRequestId, { query: { queryKey: getListRequestAssignmentsQueryKey(serviceRequestId) } });
  const resourcesQuery = useListResources(undefined, { query: { queryKey: getListResourcesQueryKey() } });
  const createAssignment = useCreateResourceAssignment();
  const cancelAssignment = useCancelResourceAssignment();
  const [resourceId, setResourceId] = useState("");
  const suggestedStart = suggestedDate ? new Date(suggestedDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [startAt, setStartAt] = useState(toLocalInputValue(suggestedStart));
  const [endAt, setEndAt] = useState(toLocalInputValue(new Date(suggestedStart.getTime() + 4 * 60 * 60 * 1000)));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const availableResources = (resourcesQuery.data?.resources ?? []).filter((resource) => resource.status === "disponible");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListRequestAssignmentsQueryKey(serviceRequestId) });
    queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
  };

  const assign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!resourceId) {
      setError("Selecciona un recurso.");
      return;
    }
    createAssignment.mutate(
      { serviceRequestId, data: { resourceId, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() } },
      {
        onSuccess: () => { setNotice("Recurso asignado."); refresh(); },
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos asignar el recurso.")),
      },
    );
  };

  const cancel = (assignmentId: string) => {
    setError("");
    setNotice("");
    cancelAssignment.mutate({ assignmentId }, {
      onSuccess: () => { setNotice("Asignación cancelada."); refresh(); },
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos cancelar la asignación.")),
    });
  };

  const assignments = assignmentsQuery.data?.assignments ?? [];

  return <div style={{ marginTop: 22 }}>
    <h2 className="section-title">Recursos asignados</h2>
    {assignments.length === 0 ? <p style={{ fontSize: 12, color: "var(--muted)" }}>Todavía no hay recursos asignados a esta solicitud.</p>
    : <ul style={{ listStyle: "none", padding: 0, margin: "10px 0", display: "grid", gap: 8 }}>
        {assignments.map((assignment) => <li key={assignment.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12 }}>
          <strong>{assignment.resourceName}</strong>
          <span style={{ color: "var(--muted)" }}>{formatDateTime(assignment.startAt)} → {formatDateTime(assignment.endAt)}</span>
          <span className={`pill ${assignment.status === "activa" ? "active" : "inactive"}`}>{assignment.status === "activa" ? "Activa" : assignment.status === "cancelada" ? "Cancelada" : "Finalizada"}</span>
          {assignment.status === "activa" && <button className="table-action" type="button" disabled={cancelAssignment.isPending} onClick={() => cancel(assignment.id)}>Cancelar</button>}
        </li>)}
      </ul>}

    {notice && <div className="success-banner" role="status"><CheckCircle2 size={17} /><span>{notice}</span></div>}
    {error && <div className="page-inline-error" role="alert">{error}</div>}

    <form onSubmit={assign} style={{ marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="field"><label htmlFor="assignment-resource">Recurso</label><select id="assignment-resource" value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
          <option value="">Selecciona un recurso</option>
          {availableResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
        </select></div>
        <div className="field"><label htmlFor="assignment-start">Desde</label><input id="assignment-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></div>
        <div className="field"><label htmlFor="assignment-end">Hasta</label><input id="assignment-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required /></div>
      </div>
      <button className="secondary-btn" type="submit" disabled={createAssignment.isPending} style={{ marginTop: 8 }}>{createAssignment.isPending ? "Asignando…" : "Asignar recurso"}</button>
    </form>
  </div>;
}


const AGENT_SUGGESTIONS = [
  "¿Qué servicios tienen disponibles?",
  "¿Hay alguna sala libre mañana a las 3 de la tarde?",
  "Consulta la póliza de demostración DEMO-0001",
  "Quiero hablar con una persona",
];


const CONTACT_CHANNEL_LABELS: Record<ContactChannel["type"], string> = {
  telefono: "Teléfono",
  correo: "Correo",
  whatsapp: "WhatsApp",
  otro: "Otro",
};

function SupportChannelsPanel() {
  const queryClient = useQueryClient();
  const channelsQuery = useListContactChannels({ query: { queryKey: getListContactChannelsQueryKey() } });
  const createChannel = useCreateContactChannel();
  const updateChannel = useUpdateContactChannel();
  const [type, setType] = useState<ContactChannel["type"]>("telefono");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const channels = channelsQuery.data?.channels ?? [];

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    createChannel.mutate({ data: { type, value: value.trim() } }, {
      onSuccess: () => {
        setValue("");
        queryClient.invalidateQueries({ queryKey: getListContactChannelsQueryKey() });
      },
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos guardar el canal.")),
    });
  };

  const toggle = (channel: ContactChannel) => {
    updateChannel.mutate({ channelId: channel.id, data: { isActive: !channel.isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContactChannelsQueryKey() }),
      onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos actualizar el canal.")),
    });
  };

  return <div className="table-wrap" style={{ marginTop: 18 }}>
    <h2 className="section-title">Canales de atención humana</h2>
    <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>El asistente ofrece estos canales cuando la persona pide hablar con alguien. Si no hay ninguno activo, avisa que no está configurado.</p>
    {channels.length > 0 && <ul style={{ listStyle: "none", padding: 0, margin: "10px 0", display: "grid", gap: 6 }}>
      {channels.map((channel) => <li key={channel.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
        <span className={`pill ${channel.isActive ? "active" : "inactive"}`}>{CONTACT_CHANNEL_LABELS[channel.type]}</span>
        <span>{channel.value}</span>
        <button className="table-action" type="button" onClick={() => toggle(channel)}>{channel.isActive ? "Desactivar" : "Activar"}</button>
      </li>)}
    </ul>}
    {error && <div className="page-inline-error" role="alert">{error}</div>}
    <form onSubmit={add} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
      <div className="field" style={{ margin: 0 }}><label htmlFor="channel-type">Tipo</label><select id="channel-type" value={type} onChange={(event) => setType(event.target.value as ContactChannel["type"])}>
        <option value="telefono">Teléfono</option>
        <option value="correo">Correo</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="otro">Otro</option>
      </select></div>
      <div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor="channel-value">Dato de contacto</label><input id="channel-value" required minLength={3} maxLength={120} value={value} onChange={(event) => setValue(event.target.value)} placeholder="0212-555-0101" /></div>
      <button className="secondary-btn" type="submit" disabled={createChannel.isPending} style={{ width: "auto" }}>Añadir</button>
    </form>
  </div>;
}

function AgentChatPage({ session }: { session: AuthenticatedSession }) {
  const chat = useAgentChat();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [tools, setTools] = useState<string[]>([]);

  const send = (text: string) => {
    const content = text.trim();
    if (!content || chat.isPending) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError("");

    chat.mutate(
      { data: { messages: next.slice(-10) } },
      {
        onSuccess: (result) => {
          setMessages([...next, { role: "assistant", content: result.reply }]);
          setTools(result.toolsUsed);
        },
        onError: (requestError) => setError(getErrorMessage(requestError, "No pudimos hablar con el asistente. Inténtalo de nuevo.")),
      },
    );
  };

  return <WorkspaceShell session={session}>
    <section className="page-content">
      <p className="page-kicker">ASISTENTE</p>
      <h1 className="page-title">Serena responde.</h1>
      <p className="page-subtitle">Consulta disponibilidad, revisa una solicitud o verifica una póliza ficticia. El asistente solo usa la información del sistema; si no la tiene, lo dice.</p>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        {messages.length === 0 && <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Prueba con:</p>
          {AGENT_SUGGESTIONS.map((suggestion) => <button key={suggestion} className="quiet-btn" type="button" style={{ textAlign: "left" }} onClick={() => send(suggestion)}>{suggestion}</button>)}
        </div>}

        <div style={{ display: "grid", gap: 12 }}>
          {messages.map((message, index) => <div key={index} style={{ justifySelf: message.role === "user" ? "end" : "start", maxWidth: "90%", background: message.role === "user" ? "var(--green, #1f3d2b)" : "transparent", color: message.role === "user" ? "#fff" : "inherit", border: message.role === "user" ? "none" : "1px solid var(--line, #dcd8cf)", padding: "10px 12px", borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap" }} data-testid={`message-agent-${message.role}`}>
            {message.content}
          </div>)}
          {chat.isPending && <div style={{ fontSize: 12, color: "var(--muted)" }}>Serena está consultando…</div>}
        </div>

        {tools.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {tools.map((tool, index) => <span key={`${tool}-${index}`} className="pill pending">{tool}</span>)}
        </div>}

        {error && <div className="page-inline-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}

        <form onSubmit={(event) => { event.preventDefault(); send(input); }} style={{ marginTop: 16 }}>
          <div className="field"><label htmlFor="agent-input">Escribe tu consulta</label><input id="agent-input" value={input} maxLength={2000} onChange={(event) => setInput(event.target.value)} placeholder="¿Qué necesitas saber?" /></div>
          <button className="primary-btn" type="submit" disabled={chat.isPending || input.trim().length === 0} style={{ width: "auto" }}>{chat.isPending ? "Consultando…" : "Enviar"}</button>
        </form>
      </div>

      {session.user.role === "administrador" && <SupportChannelsPanel />}
    </section>
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
    <Route path="/">{session ? <Redirect to="/app" /> : <PublicHome />}</Route>
    <Route path="/ingresar"><SignIn session={session} /></Route>
    <Route path="/change-password">{session ? <PasswordChange session={session} /> : <Redirect to="/ingresar" />}</Route>
    <Route path="/app">{session ? <ProtectedRoute session={session}><EmployeeHome session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/app/solicitudes">{session ? <ProtectedRoute session={session}><StaffServiceRequests session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/app/inventario">{session ? <ProtectedRoute session={session}><InventoryPage session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/app/recursos">{session ? <ProtectedRoute session={session}><ResourcesPage session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/app/asistente">{session ? <ProtectedRoute session={session}><AgentChatPage session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/admin/users">{session ? <ProtectedRoute session={session} adminOnly><AdminUsers session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route path="/admin/service-offerings">{session ? <ProtectedRoute session={session} adminOnly><AdminServiceOfferings session={session} /></ProtectedRoute> : <Redirect to="/ingresar" />}</Route>
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><div className="app-root"><AppRoutes /></div></QueryClientProvider>;
}

export default App;
