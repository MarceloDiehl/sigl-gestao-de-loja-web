package com.sigl.sigl.controller;

import com.sigl.sigl.dto.ProdutoAtualizacao;
import com.sigl.sigl.model.Produto;
import com.sigl.sigl.repository.ItemVendaRepository;
import com.sigl.sigl.repository.ProdutoRepository;
import com.sigl.sigl.service.ProdutoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/produtos")
@CrossOrigin(origins = "*")
public class ProdutoController {

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private ProdutoService produtoService;

    @Autowired
    private ItemVendaRepository itemVendaRepository;

    @GetMapping
    public List<Produto> listarProdutos() {
        return produtoRepository.findAll();
    }

    @GetMapping("/busca") // Busca parcial por código
    public List<Produto> buscarPorCodigo(@RequestParam String codigo) {
        return produtoRepository.findByCodProdutoContainingIgnoreCase(codigo);
    }

    @GetMapping("/codigo/{codigo}") // Busca exata por código
    public ResponseEntity<Produto> buscarPorCodigoExato(@PathVariable String codigo) {
        return produtoRepository.findByCodProduto(codigo)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado com código: " + codigo));
    }

    @PostMapping
    public ResponseEntity<Object> cadastrarProduto(@Valid @RequestBody Produto produto) {
        try {
            // A anotação @Valid cuida das validações de formato (NotBlank, Size, etc)
            // Nossa lógica de negócio (código duplicado) está no service
            Produto produtoSalvo = produtoService.cadastrar(produto);
            return ResponseEntity.status(HttpStatus.CREATED).body(produtoSalvo);
        } catch (IllegalArgumentException e) {
            // Captura a exceção de negócio que criamos no service
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Ocorreu um erro inesperado.");
        }
    }

    @DeleteMapping("/{codigo}")
    public ResponseEntity<String> excluirProduto(@PathVariable String codigo) {
        return produtoRepository.findByCodProduto(codigo)
                .map(produto -> {
                    // o histórico de vendas aponta para o produto (itemvenda.idProduto)
                    if (itemVendaRepository.existsByIdProduto(produto.getId())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body("O produto " + codigo + " já foi vendido e não pode ser excluído: "
                                        + "o histórico de vendas depende dele.");
                    }
                    produtoRepository.delete(produto);
                    return ResponseEntity.ok("Produto código " + codigo + " excluído!");
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Produto não encontrado para o código: " + codigo));
    }

    @PutMapping("/{codProduto}")
    public Produto atualizarProduto(@PathVariable String codProduto,
                                    @Valid @RequestBody ProdutoAtualizacao alteracao) {
        // campos inválidos (400) e produto inexistente (404) saem como ProblemDetail pelo ValidationHandler
        return produtoService.atualizar(codProduto, alteracao);
    }
}
