package com.sigl.sigl.controller;

import com.sigl.sigl.dto.FuncionarioResposta;
import com.sigl.sigl.model.Funcionario;
import com.sigl.sigl.repository.FuncionarioRepository;
import com.sigl.sigl.seguranca.UsuarioLogado;
import com.sigl.sigl.service.FuncionarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/funcionarios")
@CrossOrigin(origins = "*")
public class FuncionarioController {

    @Autowired
    private FuncionarioService funcionarioService; // Injeta o Service

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @PostMapping
    public ResponseEntity<String> criarFuncionario(@RequestBody Funcionario funcionario) {
        try {
            funcionarioService.salvar(funcionario);
            return new ResponseEntity<>("Funcionário cadastrado com sucesso!", HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping
    public List<FuncionarioResposta> listarFuncionarios(@RequestParam(value = "cpf", required = false) String cpf) {
        List<Funcionario> funcionarios = (cpf == null || cpf.isBlank())
                ? funcionarioRepository.findAll()
                : funcionarioRepository.findByCpfContaining(cpf.trim());   // consulta no banco, não em memória
        return funcionarios.stream().map(FuncionarioResposta::de).toList();
    }

    @DeleteMapping("/{id}")
    public String excluirFuncionario(@PathVariable Integer id, @AuthenticationPrincipal UsuarioLogado usuario) {
        // recusas (404, 409) saem como ProblemDetail pelo ValidationHandler
        funcionarioService.excluir(id, usuario.getId());
        return "Funcionário excluído com sucesso!";
    }
}

