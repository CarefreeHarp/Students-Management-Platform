package com.studyflow.platform.mapper;

import com.studyflow.platform.model.dto.*;
import com.studyflow.platform.model.entity.*;
import com.studyflow.platform.util.TextoUtil;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Traduce canales, mensajes, reacciones, archivos y resumenes a DTO. */
@Component
public class CanalMapper {

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public CanalDTO aDTO(Canal canal, Long usuarioActualId, boolean incluirMensajes) {
        List<MensajeChat> mensajes = canal.getMensajes();
        ResumenChat ultimo = canal.getResumenes().isEmpty() ? null : canal.getResumenes().get(0);
        return new CanalDTO(
                canal.getId(),
                canal.getNombre(),
                canal.getSlug(),
                canal.getTipo().name(),
                canal.getDescripcion(),
                canal.getProyecto() != null ? canal.getProyecto().getCodigo() : null,
                canal.getProyecto() != null ? canal.getProyecto().getNombre() : null,
                canal.getProyecto() != null ? canal.getProyecto().getColor() : "#5b5ce2",
                mensajes.size(),
                canal.getArchivos().size(),
                mensajes.isEmpty()
                        ? canal.getFechaCreacion().format(FECHA_HORA)
                        : mensajes.get(mensajes.size() - 1).getFechaEnvio().format(FECHA_HORA),
                canal.esBorrable(),
                incluirMensajes ? mensajes.stream().map(m -> aDTO(m, usuarioActualId)).toList() : List.of(),
                ultimo != null ? aDTO(ultimo) : null
        );
    }

    public MensajeChatDTO aDTO(MensajeChat mensaje, Long usuarioActualId) {
        boolean propio = mensaje.getAutor() != null
                && usuarioActualId != null
                && usuarioActualId.equals(mensaje.getAutor().getId());
        return new MensajeChatDTO(
                mensaje.getId(),
                mensaje.getAutorNombre(),
                mensaje.getAutorColor(),
                TextoUtil.iniciales(mensaje.getAutorNombre()),
                mensaje.getContenido(),
                mensaje.getFechaEnvio().format(FECHA_HORA),
                mensaje.isGeneradoPorIa(),
                propio,
                agruparReacciones(mensaje.getReacciones(), usuarioActualId),
                mensaje.getAdjuntos().stream().map(this::aDTO).toList()
        );
    }

    /**
     * Agrupa las reacciones por emoji conservando el orden de aparicion, que es
     * como se muestran bajo el mensaje: 👍 3 · 🎉 1
     */
    private List<ReaccionDTO> agruparReacciones(List<ReaccionMensaje> reacciones, Long usuarioActualId) {
        Map<String, List<ReaccionMensaje>> porEmoji = new LinkedHashMap<>();
        reacciones.forEach(reaccion ->
                porEmoji.computeIfAbsent(reaccion.getEmoji(), clave -> new java.util.ArrayList<>()).add(reaccion));

        return porEmoji.entrySet().stream()
                .map(entrada -> new ReaccionDTO(
                        entrada.getKey(),
                        entrada.getValue().size(),
                        entrada.getValue().stream()
                                .map(reaccion -> reaccion.getUsuario().getNombreCompleto())
                                .toList(),
                        entrada.getValue().stream()
                                .anyMatch(reaccion -> reaccion.getUsuario().getId().equals(usuarioActualId))))
                .toList();
    }

    public ArchivoAdjuntoDTO aDTO(ArchivoAdjunto archivo) {
        return new ArchivoAdjuntoDTO(
                archivo.getId(),
                archivo.getNombre(),
                archivo.getTipoMime(),
                archivo.getTamanoLegible(),
                archivo.isEsImagen(),
                "/api/archivos/" + archivo.getId(),
                archivo.getSubidoPor() != null ? archivo.getSubidoPor().getNombreCompleto() : "Equipo",
                archivo.getFechaSubida().format(FECHA_HORA),
                archivo.getCanal() != null ? archivo.getCanal().getNombre() : null
        );
    }

    public ResumenChatDTO aDTO(ResumenChat resumen) {
        List<String> puntos = resumen.getPuntosClave() == null || resumen.getPuntosClave().isBlank()
                ? List.of()
                : Arrays.stream(resumen.getPuntosClave().split("\n"))
                        .map(String::trim)
                        .filter(linea -> !linea.isBlank())
                        .toList();
        return new ResumenChatDTO(
                resumen.getId(),
                resumen.getContenido(),
                puntos,
                resumen.getMensajesResumidos(),
                resumen.getModelo(),
                resumen.getFechaGeneracion().format(FECHA_HORA)
        );
    }
}
