package com.sigl.sigl.service;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Funcionario;
import com.sigl.sigl.repository.FuncionarioRepository;
import com.sigl.sigl.repository.VendaRepository;
import com.sigl.sigl.seguranca.SegurancaConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuncionarioServiceTest {

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @Mock
    private VendaRepository vendaRepository;

    private final PasswordEncoder passwordEncoder = new SegurancaConfig().passwordEncoder();
    private FuncionarioService funcionarioService;
    private Funcionario funcionario;

    @BeforeEach
    void preparar() {
        funcionarioService = new FuncionarioService(funcionarioRepository, vendaRepository, new ValidatorService(), passwordEncoder);
        funcionario = new Funcionario();
        funcionario.setCpf("529.982.247-25");
        funcionario.setCep("90050-320");
        funcionario.setTelefone("(51) 99812-4410");
        funcionario.setEmail("nova@orion.com.br");
    }

    @Test
    @DisplayName("Grava a senha só como hash BCrypt, nunca como foi digitada")
    void salvar_GravaSenhaEmBcrypt() {
        funcionario.setSenha("senha-nova");
        when(funcionarioRepository.save(any(Funcionario.class))).thenAnswer(i -> i.getArgument(0));

        Funcionario salvo = funcionarioService.salvar(funcionario);

        assertTrue(salvo.getSenha().startsWith("{bcrypt}"));
        assertNotEquals("senha-nova", salvo.getSenha());
        assertTrue(passwordEncoder.matches("senha-nova", salvo.getSenha()));
    }

    @Test
    @DisplayName("Recusa senha com menos de 5 caracteres")
    void salvar_SenhaCurta_Recusa() {
        funcionario.setSenha("1234");

        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class, () -> funcionarioService.salvar(funcionario));
        assertEquals("A senha deve ter pelo menos 5 caracteres.", erro.getMessage());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Recusa CPF já cadastrado (409), apontando o campo")
    void salvar_CpfRepetido_Recusa() {
        funcionario.setSenha("senha-nova");
        when(funcionarioRepository.existsByCpf("529.982.247-25")).thenReturn(true);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(funcionario));
        assertEquals(HttpStatus.CONFLICT, erro.getStatus());
        assertEquals("cpf", erro.getCampo());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ninguém exclui o próprio cadastro")
    void excluir_SiMesmo_Recusa() {
        when(funcionarioRepository.existsById(3)).thenReturn(true);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.excluir(3, 3));
        assertEquals(HttpStatus.CONFLICT, erro.getStatus());
        verify(funcionarioRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Funcionário com vendas não é excluído: o histórico depende dele")
    void excluir_ComVendas_Recusa() {
        when(funcionarioRepository.existsById(5)).thenReturn(true);
        when(vendaRepository.existsByVendedorId(5)).thenReturn(true);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.excluir(5, 3));
        assertEquals(HttpStatus.CONFLICT, erro.getStatus());
        verify(funcionarioRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Funcionário inexistente: 404, sem tentar excluir")
    void excluir_Inexistente_Devolve404() {
        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.excluir(99, 3));
        assertEquals(HttpStatus.NOT_FOUND, erro.getStatus());
        verify(funcionarioRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Outro funcionário, sem vendas, é excluído")
    void excluir_SemVendas_Exclui() {
        when(funcionarioRepository.existsById(5)).thenReturn(true);
        when(vendaRepository.existsByVendedorId(5)).thenReturn(false);

        funcionarioService.excluir(5, 3);

        verify(funcionarioRepository).deleteById(5);
    }
}
