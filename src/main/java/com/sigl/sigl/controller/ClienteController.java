package com.sigl.sigl.controller;

import com.sigl.sigl.dto.ClienteResposta;
import com.sigl.sigl.model.Cliente;
import com.sigl.sigl.repository.ClienteRepository;
import com.sigl.sigl.seguranca.UsuarioLogado;
import com.sigl.sigl.service.ClienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@CrossOrigin(origins = "*")
public class ClienteController {

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private ClienteRepository clienteRepository;

    @PostMapping
    public ResponseEntity<String> criarCliente(@RequestBody Cliente cliente) {
        try {
            clienteService.salvar(cliente);
            return new ResponseEntity<>("Cliente cadastrado com sucesso!", HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Gerente: ficha completa e busca por qualquer parte do CPF. Demais cargos: dados resumidos
     * (CPF mascarado, sem RG, nascimento e endereço) e busca só pelo CPF completo, para que
     * buscas por pedaços do CPF não revelem os dígitos que a máscara esconde.
     */
    @GetMapping
    public List<ClienteResposta> listarClientes(@RequestParam(value = "cpf", required = false) String cpf,
                                                @AuthenticationPrincipal UsuarioLogado usuario) {
        boolean fichaCompleta = usuario.isPodeGerir();
        List<Cliente> clientes;
        if (cpf == null || cpf.isBlank()) {
            clientes = clienteRepository.findAll();
        } else if (!fichaCompleta && cpf.replaceAll("\\D", "").length() != 11) {
            clientes = List.of();
        } else {
            clientes = clienteRepository.findByCpfContaining(cpf.trim());   // consulta no banco, não em memória
        }
        return clientes.stream()
                .map(fichaCompleta ? ClienteResposta::completo : ClienteResposta::resumido)
                .toList();
    }

    @DeleteMapping("/{id}")
    public String excluirCliente(@PathVariable Integer id) {
        clienteService.excluir(id);   // recusas (404) saem como ProblemDetail pelo ValidationHandler
        return "Cliente excluído com sucesso!";
    }

}
