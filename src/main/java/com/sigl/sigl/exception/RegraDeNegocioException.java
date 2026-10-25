package com.sigl.sigl.exception;

import org.springframework.http.HttpStatus;

/**
 * Pedido recusado por uma regra do negócio (estoque insuficiente, vendedor inexistente...).
 * A mensagem é escrita para o usuário e vai para a tela como está. Quando a recusa é por causa
 * de um campo do formulário (CPF já cadastrado, por exemplo), o campo vai junto, e a tela mostra
 * a mensagem embaixo dele.
 */
public class RegraDeNegocioException extends RuntimeException {

    private final HttpStatus status;
    private final String campo;

    public RegraDeNegocioException(HttpStatus status, String mensagem) {
        this(status, mensagem, null);
    }

    public RegraDeNegocioException(HttpStatus status, String mensagem, String campo) {
        super(mensagem);
        this.status = status;
        this.campo = campo;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCampo() {
        return campo;
    }
}
