package com.sigl.sigl.service;

import com.sigl.sigl.dto.ProdutoAtualizacao;
import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Produto;
import com.sigl.sigl.repository.ProdutoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProdutoServiceTest {

    @Mock
    private ProdutoRepository produtoRepository;

    @InjectMocks
    private ProdutoService produtoService;

    @Test
    @DisplayName("Deve cadastrar produto com sucesso quando código não existe")
    void cadastrar_DeveSalvarProduto_QuandoCodigoNaoExiste() {
        Produto produto = new Produto("PRD001", "Notebook", "Desc", BigDecimal.TEN, 10, 1, 1, LocalDate.now());
        when(produtoRepository.existsById("PRD001")).thenReturn(false);
        when(produtoRepository.save(produto)).thenReturn(produto);

        Produto produtoSalvo = produtoService.cadastrar(produto);

        assertNotNull(produtoSalvo);
        assertEquals("PRD001", produtoSalvo.getCodProduto());
        verify(produtoRepository, times(1)).save(produto);
    }

    @Test
    @DisplayName("Deve lançar exceção ao tentar cadastrar produto com código que já existe")
    void cadastrar_DeveLancarExcecao_QuandoCodigoJaExiste() {
        Produto produto = new Produto("PRD001", "Notebook", "Desc", BigDecimal.TEN, 10, 1, 1, LocalDate.now());
        when(produtoRepository.existsById("PRD001")).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            produtoService.cadastrar(produto);
        });

        assertEquals("Erro: Já existe um produto com o código PRD001", exception.getMessage());
        verify(produtoRepository, never()).save(any(Produto.class));
    }

    @Test
    @DisplayName("Atualização muda só os campos enviados")
    void atualizar_MudaSoOsCamposEnviados() {
        Produto produto = new Produto("PRD001", "Notebook", "Desc", BigDecimal.TEN, 10, 1, 1, LocalDate.of(2026, 1, 5));
        when(produtoRepository.findByCodProduto("PRD001")).thenReturn(Optional.of(produto));
        when(produtoRepository.saveAndFlush(produto)).thenReturn(produto);

        produtoService.atualizar("PRD001", new ProdutoAtualizacao(
                "  Notebook Pro ", null, new BigDecimal("12.50"), 3, null, null, null));

        assertEquals("Notebook Pro", produto.getTitulo());
        assertEquals("Desc", produto.getDescricao());
        assertEquals(new BigDecimal("12.50"), produto.getValor());
        assertEquals(3, produto.getQuantidade());
        assertEquals(1, produto.getIdTipo());
        assertEquals(LocalDate.of(2026, 1, 5), produto.getEntrada());
    }

    @Test
    @DisplayName("Atualizar produto inexistente devolve 404")
    void atualizar_Inexistente_Devolve404() {
        when(produtoRepository.findByCodProduto("XXXXXX")).thenReturn(Optional.empty());
        ProdutoAtualizacao alteracao = new ProdutoAtualizacao(null, null, null, 1, null, null, null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> produtoService.atualizar("XXXXXX", alteracao));
        assertEquals(HttpStatus.NOT_FOUND, erro.getStatus());
        verify(produtoRepository, never()).saveAndFlush(any());
    }
}
