package com.studyflow.platform;

import com.studyflow.platform.mapper.RecordatorioMapper;
import com.studyflow.platform.model.dto.PeticionPreferenciaRecordatorio;
import com.studyflow.platform.model.dto.PeticionRecordatorio;
import com.studyflow.platform.model.entity.PreferenciaRecordatorio;
import com.studyflow.platform.model.entity.Recordatorio;
import com.studyflow.platform.model.entity.Usuario;
import com.studyflow.platform.model.enums.EstadoRecordatorio;
import com.studyflow.platform.model.enums.TipoRecordatorio;
import com.studyflow.platform.repository.ApunteClaseRepository;
import com.studyflow.platform.repository.PreferenciaRecordatorioRepository;
import com.studyflow.platform.repository.ProyectoRepository;
import com.studyflow.platform.repository.RecordatorioRepository;
import com.studyflow.platform.service.PasarelaMensajeria;
import com.studyflow.platform.service.UsuarioService;
import com.studyflow.platform.service.impl.RecordatorioServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordatoriosPersonalesTests {
    @Mock PreferenciaRecordatorioRepository preferencias;
    @Mock RecordatorioRepository recordatorios;
    @Mock ProyectoRepository proyectos;
    @Mock ApunteClaseRepository apuntes;
    @Mock UsuarioService usuarios;
    @Mock PasarelaMensajeria pasarela;
    private RecordatorioServiceImpl servicio;
    private Usuario usuario;
    private PreferenciaRecordatorio preferencia;

    @BeforeEach
    void preparar() {
        servicio = new RecordatorioServiceImpl(preferencias, recordatorios, proyectos, apuntes,
                usuarios, pasarela, new RecordatorioMapper());
        usuario = new Usuario();
        usuario.setId(7L);
        preferencia = new PreferenciaRecordatorio(usuario);
    }

    @Test
    void elAvisoPersonalUsaLaFechaHoraYAntelacionElegidas() {
        when(preferencias.findByUsuarioId(7L)).thenReturn(Optional.of(preferencia));
        when(usuarios.obtenerPorId(7L)).thenReturn(usuario);
        when(recordatorios.save(any())).thenAnswer(invocacion -> invocacion.getArgument(0));
        LocalDateTime vencimiento = LocalDateTime.now().plusDays(4).withHour(16).withMinute(30).withSecond(0).withNano(0);

        var dto = servicio.crearPersonal(7L, new PeticionRecordatorio("  Exposición  ", "Llevar notas", vencimiento, 180));

        ArgumentCaptor<Recordatorio> guardado = ArgumentCaptor.forClass(Recordatorio.class);
        verify(recordatorios).save(guardado.capture());
        assertThat(guardado.getValue().getUsuario()).isSameAs(usuario);
        assertThat(guardado.getValue().getFechaHora()).isEqualTo(vencimiento.minusHours(3));
        assertThat(guardado.getValue().getFechaVencimiento()).isEqualTo(vencimiento);
        assertThat(dto.tipo()).isEqualTo("PERSONAL");
        assertThat(dto.titulo()).isEqualTo("Exposición");
        assertThat(dto.estado()).isEqualTo("PROGRAMADO");
        verifyNoInteractions(pasarela);
    }

    @Test
    void noSeAdmiteUnAvisoCuyaAntelacionLoDejaEnElPasado() {
        assertThatThrownBy(() -> servicio.crearPersonal(7L,
                new PeticionRecordatorio("Entrega", null, LocalDateTime.now().plusHours(1), 120)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ya pasó");
        verifyNoInteractions(recordatorios, pasarela);
    }

    @Test
    void noSeAdmiteUnAvisoSiLosRecordatoriosEstanDesactivados() {
        preferencia.setActivo(false);
        when(preferencias.findByUsuarioId(7L)).thenReturn(Optional.of(preferencia));
        assertThatThrownBy(() -> servicio.crearPersonal(7L,
                new PeticionRecordatorio("Entrega", null, LocalDateTime.now().plusDays(3), 60)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Activa los avisos");
        verifyNoInteractions(recordatorios, pasarela);
    }

    @Test
    void recalcularLosEstandaresConservaLaHoraYEstadoDelAvisoPersonal() {
        when(preferencias.findByUsuarioId(7L)).thenReturn(Optional.of(preferencia));
        when(usuarios.obtenerPorId(7L)).thenReturn(usuario);
        Recordatorio personal = aviso(TipoRecordatorio.PERSONAL);
        Recordatorio automatico = aviso(TipoRecordatorio.TAREA);
        LocalDateTime fechaPersonal = personal.getFechaHora();
        when(recordatorios.findByUsuarioIdAndEstadoOrderByFechaHoraAsc(7L, EstadoRecordatorio.PROGRAMADO))
                .thenReturn(List.of(personal, automatico));

        servicio.guardarPreferencias(7L,
                new PeticionPreferenciaRecordatorio(null, null, true, 2880, 4320, 120, "", ""));

        assertThat(personal.getEstado()).isEqualTo(EstadoRecordatorio.PROGRAMADO);
        assertThat(personal.getFechaHora()).isEqualTo(fechaPersonal);
        assertThat(automatico.getEstado()).isEqualTo(EstadoRecordatorio.CANCELADO);
        verify(pasarela, never()).enviarTexto(anyString(), anyString());
    }

    @Test
    void desactivarCancelaTambienLosAvisosPersonales() {
        when(preferencias.findByUsuarioId(7L)).thenReturn(Optional.of(preferencia));
        when(usuarios.obtenerPorId(7L)).thenReturn(usuario);
        Recordatorio personal = aviso(TipoRecordatorio.PERSONAL);
        when(recordatorios.findByUsuarioIdAndEstadoOrderByFechaHoraAsc(7L, EstadoRecordatorio.PROGRAMADO))
                .thenReturn(List.of(personal));

        servicio.guardarPreferencias(7L,
                new PeticionPreferenciaRecordatorio(null, null, false, null, null, null, "", ""));

        assertThat(personal.getEstado()).isEqualTo(EstadoRecordatorio.CANCELADO);
    }

    @Test
    void laConfiguracionNuevaEliminaLasFranjasDeSilencioAntiguas() {
        preferencia.setSilencioDesde(LocalTime.of(22, 0));
        preferencia.setSilencioHasta(LocalTime.of(7, 0));
        when(preferencias.findByUsuarioId(7L)).thenReturn(Optional.of(preferencia));
        when(usuarios.obtenerPorId(7L)).thenReturn(usuario);

        var dto = servicio.guardarPreferencias(7L,
                new PeticionPreferenciaRecordatorio(null, null, true, null, null, null, "", ""));

        assertThat(dto.silencioDesde()).isNull();
        assertThat(dto.silencioHasta()).isNull();
        assertThat(preferencia.enSilencio(LocalTime.of(23, 0))).isFalse();
    }

    @Test
    void lasCuentasNuevasNoTienenUnaFranjaDeSilencioOculta() {
        assertThat(preferencia.getSilencioDesde()).isNull();
        assertThat(preferencia.getSilencioHasta()).isNull();
        assertThat(preferencia.enSilencio(LocalTime.of(23, 0))).isFalse();
    }

    private Recordatorio aviso(TipoRecordatorio tipo) {
        Recordatorio aviso = new Recordatorio();
        aviso.setTipo(tipo);
        aviso.setFechaHora(LocalDateTime.now().plusDays(2));
        return aviso;
    }
}
