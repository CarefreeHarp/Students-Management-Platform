package com.studyflow.platform.model.enums;

/**
 * Tipo de entregable del registro del proyecto. Se usa para elegir el icono
 * y agrupar los enlaces en la interfaz.
 */
public enum TipoEntregable {

    DOCUMENTO("Documento", "bi-file-earmark-text"),
    PRESENTACION("Presentación", "bi-easel"),
    DISENO("Diseño", "bi-palette"),
    HOJA_CALCULO("Hoja de cálculo", "bi-file-earmark-spreadsheet"),
    CODIGO("Repositorio", "bi-github"),
    VIDEO("Video", "bi-camera-video"),
    OTRO("Otro", "bi-link-45deg");

    private final String etiqueta;
    private final String icono;

    TipoEntregable(String etiqueta, String icono) {
        this.etiqueta = etiqueta;
        this.icono = icono;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    public String getIcono() {
        return icono;
    }

    /**
     * Deduce el tipo a partir del dominio del enlace, para que el estudiante
     * no tenga que clasificarlo a mano al pegar una URL.
     */
    public static TipoEntregable desdeUrl(String url) {
        if (url == null) {
            return OTRO;
        }
        String minusculas = url.toLowerCase();
        if (minusculas.contains("canva.")) return DISENO;
        if (minusculas.contains("figma.")) return DISENO;
        if (minusculas.contains("docs.google.com/document") || minusculas.contains(".docx")
                || minusculas.contains("word")) return DOCUMENTO;
        if (minusculas.contains("docs.google.com/presentation") || minusculas.contains(".pptx")
                || minusculas.contains("slides") || minusculas.contains("prezi.")) return PRESENTACION;
        if (minusculas.contains("docs.google.com/spreadsheets") || minusculas.contains(".xlsx")
                || minusculas.contains("sheets")) return HOJA_CALCULO;
        if (minusculas.contains("github.") || minusculas.contains("gitlab.")) return CODIGO;
        if (minusculas.contains("youtube.") || minusculas.contains("youtu.be")
                || minusculas.contains("vimeo.")) return VIDEO;
        return OTRO;
    }
}
