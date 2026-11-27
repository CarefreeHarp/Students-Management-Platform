package com.studyflow.platform.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@ConditionalOnExpression("${studyflow.admin.enabled:false} or ${studyflow.admin.catalogo:false}")
public @interface PanelAdminHabilitado {}
