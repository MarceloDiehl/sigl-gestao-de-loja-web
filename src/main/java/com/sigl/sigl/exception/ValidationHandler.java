package com.sigl.sigl.exception;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Todos os erros de regra e de validação saem no formato ProblemDetail (RFC 9457), com a mensagem
 * em "detail". Quando o erro é de um campo, vai também "campos": {"quantidade": "A quantidade não
 * pode ser negativa."}, com os nomes do JSON enviado; a tela usa esse mapa para marcar cada campo.
 */
@ControllerAdvice
public class ValidationHandler extends ResponseEntityExceptionHandler {

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError erro : ex.getBindingResult().getFieldErrors()) {
            campos.putIfAbsent(erro.getField(), erro.getDefaultMessage());
        }

        String detalhe = campos.size() == 1
                ? campos.values().iterator().next()
                : "Corrija os campos indicados.";
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detalhe);
        problema.setProperty("campos", campos);
        return ResponseEntity.badRequest().body(problema);
    }

    // {"status": 409, "detail": "Só há 1 unidade..."}; com campo: {"detail": ..., "campos": {"cpf": ...}}
    @ExceptionHandler(RegraDeNegocioException.class)
    public ProblemDetail handleRegraDeNegocio(RegraDeNegocioException ex) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        if (ex.getCampo() != null) {
            problema.setProperty("campos", Map.of(ex.getCampo(), ex.getMessage()));
        }
        return problema;
    }
}
