package com.sigl.sigl.service;

import com.sigl.sigl.dto.ProdutoAtualizacao;
import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Produto;
import com.sigl.sigl.repository.ProdutoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    @Autowired
    public ProdutoService(ProdutoRepository produtoRepository) {
        this.produtoRepository = produtoRepository;
    }

    @Transactional
    public Produto cadastrar(Produto produto) {
        if (produtoRepository.existsById(produto.getCodProduto())) {
            throw new IllegalArgumentException("Erro: Já existe um produto com o código " + produto.getCodProduto());
        }
        return produtoRepository.save(produto);
    }

    /** Aplica só os campos enviados; os formatos já foram conferidos pelo @Valid do controller. */
    @Transactional
    public Produto atualizar(String codProduto, ProdutoAtualizacao alteracao) {
        Produto produto = produtoRepository.findByCodProduto(codProduto)
                .orElseThrow(() -> new RegraDeNegocioException(HttpStatus.NOT_FOUND,
                        "Produto não encontrado para o código: " + codProduto));

        if (alteracao.titulo() != null) produto.setTitulo(alteracao.titulo().trim());
        if (alteracao.descricao() != null) produto.setDescricao(alteracao.descricao().trim());
        if (alteracao.valor() != null) produto.setValor(alteracao.valor());
        if (alteracao.quantidade() != null) produto.setQuantidade(alteracao.quantidade());
        if (alteracao.idTipo() != null) produto.setIdTipo(alteracao.idTipo());
        if (alteracao.idCondicao() != null) produto.setIdCondicao(alteracao.idCondicao());
        if (alteracao.entrada() != null) produto.setEntrada(alteracao.entrada());

        try {
            // flush aqui para a chave estrangeira de tipo/condição ser conferida dentro deste método
            return produtoRepository.saveAndFlush(produto);
        } catch (DataIntegrityViolationException e) {
            throw new RegraDeNegocioException(HttpStatus.BAD_REQUEST, "Tipo ou condição de produto inexistente.");
        }
    }
}
