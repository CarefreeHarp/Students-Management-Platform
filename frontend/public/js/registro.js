/*
 * Registro reducido a lo imprescindible: nombre, correo y contraseña.
 * Los datos académicos son opcionales y viajan solo si se rellenan.
 */
export function mount(scope) {
  const { t: uiText } = scope;
  const { document, listen, request, later, animate } = scope;

  function feedback(mensaje, tipo) {
    const caja = document.querySelector("#register-feedback");
    caja.textContent = mensaje;
    caja.classList.toggle("is-visible", Boolean(mensaje));
    caja.classList.toggle("is-success", tipo === "success");
  }

  const valor = (selector) => document.querySelector(selector).value.trim();

  async function registrar(evento) {
    evento.preventDefault();

    const nombreCompleto = valor("#register-name");
    const correo = valor("#register-email");
    const contrasena = document.querySelector("#register-password").value;

    if (!nombreCompleto) {
      feedback(uiText("registro.escribe_tu_nombre"), "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      feedback(uiText("registro.ingresa_un_correo_electronico_valido"), "error");
      return;
    }
    if ([...contrasena].length < 12 || new TextEncoder().encode(contrasena).length > 72) {
      feedback(uiText("registro.usa_al_menos_12_caracteres_y_como_maximo"), "error");
      return;
    }

    const [nombre, ...resto] = nombreCompleto.split(/\s+/);
    const cuerpo = {
      firstName: nombre,
      lastName: resto.join(" "),
      email: correo,
      password: contrasena,
      university: valor("#register-university"),
      career: valor("#register-career"),
      semester: valor("#register-semester"),
      age: valor("#register-age")
    };

    try {
      const respuesta = await request("/api/usuarios/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.json().catch(() => ({}));
        throw new Error(detalle.detail || uiText("registro.no_fue_posible_crear_la_cuenta"));
      }
      const usuario = await respuesta.json();

      const volver = new URLSearchParams(location.search).get("volver") || "";
      const desdeInvitacion = volver === "/invitacion";
      const planElegido = /^\/planes\/confirmar\/(mensual|semestral|vitalicio)$/.test(volver);
      const destino = desdeInvitacion ? "/invitacion" + location.hash : planElegido ? volver : "/panel";
      const linkAcceso = desdeInvitacion ? "/login?acceso=cuenta&volver=%2Finvitacion" + location.hash : planElegido ? "/login?acceso=cuenta&volver=" + encodeURIComponent(volver) : "/login?acceso=cuenta";
      const inicio = await request("/api/sesion/acceder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: usuario.correo, contrasena })
      });
      if (!inicio.ok) {
        feedback(uiText("registro.cuenta_creada_ya_puedes_ingresar_con_tu_contrasena"), "success");
        later(() => scope.navigate(linkAcceso), 800);
        return;
      }

      feedback(uiText("registro.cuenta_creada_entrando"), "success");
      later(() => scope.navigate(destino), 400);
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  function init() {
    document.querySelector("#register-form").addEventListener("submit", registrar);
    const volver = new URLSearchParams(location.search).get("volver") || "";
    if (/^\/planes\/confirmar\/(mensual|semestral|vitalicio)$/.test(volver)) {
      document.querySelector('a[href="/login?acceso=cuenta"]')?.setAttribute("href", "/login?acceso=cuenta&volver=" + encodeURIComponent(volver));
    }

    document.querySelectorAll("[data-password-toggle]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const campo = document.getElementById(boton.dataset.passwordToggle);
        const oculta = campo.type === "password";
        campo.type = oculta ? "text" : "password";
        boton.querySelector("i").className = `bi bi-eye${oculta ? "-slash" : ""}`;
      });
    });
  }

  init();
}
