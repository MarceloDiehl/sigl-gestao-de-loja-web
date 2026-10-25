package com.sigl.sigl.service;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Funcionario;
import com.sigl.sigl.repository.FuncionarioRepository;
import com.sigl.sigl.repository.VendaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class FuncionarioService {

    private final FuncionarioRepository funcionarioRepository;
    private final VendaRepository vendaRepository;
    private final ValidatorService validatorService;
    private final PasswordEncoder passwordEncoder;

    private static final int TAMANHO_MINIMO_SENHA = 5;

    @Autowired
    public FuncionarioService(FuncionarioRepository funcionarioRepository, VendaRepository vendaRepository,
                              ValidatorService validatorService, PasswordEncoder passwordEncoder) {
        this.funcionarioRepository = funcionarioRepository;
        this.vendaRepository = vendaRepository;
        this.validatorService = validatorService;
        this.passwordEncoder = passwordEncoder;
    }

    public Funcionario salvar(Funcionario funcionario) {
        validarFuncionario(funcionario);
        if (funcionarioRepository.existsByCpf(funcionario.getCpf())) {
            throw new RegraDeNegocioException(HttpStatus.CONFLICT, "Já existe um funcionário com este CPF.", "cpf");
        }
        if (funcionarioRepository.existsByEmail(funcionario.getEmail())) {
            throw new RegraDeNegocioException(HttpStatus.CONFLICT, "Já existe um funcionário com este e-mail.", "email");
        }

        // A senha chega como foi digitada e é gravada só como hash BCrypt ("{bcrypt}$2a$10$...")
        funcionario.setSenha(passwordEncoder.encode(funcionario.getSenha()));
        return funcionarioRepository.save(funcionario);
    }

    /**
     * Quem está logado não exclui a si mesmo (o gerente ficaria sem acesso no meio do uso), e quem
     * já vendeu não é excluído: cada venda guarda o vendedor (venda.idVendedor).
     */
    public void excluir(Integer id, Integer idDeQuemExclui) {
        if (!funcionarioRepository.existsById(id)) {
            throw new RegraDeNegocioException(HttpStatus.NOT_FOUND, "Funcionário não encontrado.");
        }
        if (id.equals(idDeQuemExclui)) {
            throw new RegraDeNegocioException(HttpStatus.CONFLICT, "Você não pode excluir o seu próprio cadastro.");
        }
        if (vendaRepository.existsByVendedorId(id)) {
            throw new RegraDeNegocioException(HttpStatus.CONFLICT,
                    "Este funcionário tem vendas registradas e não pode ser excluído: o histórico de vendas depende dele.");
        }
        funcionarioRepository.deleteById(id);
    }

    private void validarFuncionario(Funcionario funcionario) {
        validatorService.validarCpf(funcionario.getCpf());
        validatorService.validarCep(funcionario.getCep());
        validatorService.validarTelefone(funcionario.getTelefone());
        String senha = funcionario.getSenha();
        if (senha == null || senha.length() < TAMANHO_MINIMO_SENHA) {
            throw new IllegalArgumentException("A senha deve ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres.");
        }
    }
}
