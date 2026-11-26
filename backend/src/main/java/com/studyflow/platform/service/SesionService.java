package com.studyflow.platform.service;

import com.studyflow.platform.model.entity.Usuario;

public interface SesionService {
    Usuario usuarioActual();
    Long usuarioActualId();
    boolean haySesionIniciada();
    Usuario entrarComoDemostracion();
    String nombreCuentaDemostracion();
}
