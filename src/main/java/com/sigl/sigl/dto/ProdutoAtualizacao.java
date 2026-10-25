package com.sigl.sigl.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Alteração de um produto já cadastrado. O código não muda (vem na URL). Campo ausente (null)
 * fica como está: o modal do Estoque envia só quantidade e valor; a tela de edição envia tudo.
 * As regras são as mesmas do cadastro, aplicadas a cada campo enviado.
 */
public record ProdutoAtualizacao(
        @Pattern(regexp = "(?s).*\\S.*", message = "O título não pode ficar em branco.")
        @Size(max = 70, message = "O título não pode exceder 70 caracteres.")
        String titulo,

        @Pattern(regexp = "(?s).*\\S.*", message = "A descrição não pode ficar em branco.")
        @Size(max = 255, message = "A descrição não pode exceder 255 caracteres.")
        String descricao,

        @DecimalMin(value = "0.01", message = "O valor unitário deve ser maior que zero.")
        BigDecimal valor,

        @Min(value = 0, message = "A quantidade não pode ser negativa.")
        Integer quantidade,

        @Positive(message = "Selecione o tipo do produto.")
        Integer idTipo,

        @Positive(message = "Selecione a condição do produto.")
        Integer idCondicao,

        @PastOrPresent(message = "A data de entrada não pode ser futura.")
        LocalDate entrada
) {
}
