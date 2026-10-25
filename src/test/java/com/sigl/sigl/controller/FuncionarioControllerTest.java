package com.sigl.sigl.controller;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Funcionario;
import com.sigl.sigl.model.apoio.Cargo;
import com.sigl.sigl.repository.FuncionarioRepository;
import com.sigl.sigl.seguranca.UsuarioLogado;
import com.sigl.sigl.service.FuncionarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FuncionarioController.class)
@WithMockUser   // a API exige login; aqui basta um usuário qualquer autenticado
class FuncionarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FuncionarioRepository funcionarioRepository;

    @MockitoBean
    private FuncionarioService funcionarioService;

    @Test
    @DisplayName("Listagem de funcionários não devolve a senha")
    void listarFuncionarios_NaoDevolveSenha() throws Exception {
        Funcionario funcionario = new Funcionario();
        funcionario.setId(3);
        funcionario.setNome("Marcelo");
        funcionario.setCpf("390.533.447-05");
        funcionario.setEmail("marcelo@orion.com.br");
        funcionario.setSenha("e10adc3949ba59abbe56e057f20f883e");
        when(funcionarioRepository.findAll()).thenReturn(List.of(funcionario));

        mockMvc.perform(get("/api/funcionarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Marcelo"))
                .andExpect(jsonPath("$[0].email").value("marcelo@orion.com.br"))
                .andExpect(jsonPath("$[0].senha").doesNotExist());
    }

    @Test
    @DisplayName("Filtro por CPF consulta o banco (não filtra em memória) e também não devolve a senha")
    void listarFuncionarios_ComFiltroDeCpf_NaoDevolveSenha() throws Exception {
        Funcionario funcionario = new Funcionario();
        funcionario.setCpf("390.533.447-05");
        funcionario.setSenha("e10adc3949ba59abbe56e057f20f883e");
        when(funcionarioRepository.findByCpfContaining("390.533")).thenReturn(List.of(funcionario));

        mockMvc.perform(get("/api/funcionarios").param("cpf", "390.533"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].senha").doesNotExist());
    }

    private static final UsuarioLogado GERENTE = new UsuarioLogado(2, "g@orion", null, "Gê", "Rente", Cargo.GERENTE, "Gerente");

    @Test
    @DisplayName("Exclusão passa ao service quem está logado")
    void excluir_PassaOUsuarioLogado() throws Exception {
        mockMvc.perform(delete("/api/funcionarios/5").with(csrf()).with(user(GERENTE)))
                .andExpect(status().isOk());
        verify(funcionarioService).excluir(5, 2);
    }

    @Test
    @DisplayName("Exclusão recusada responde com o status da recusa (não 200) e a mensagem em detail")
    void excluir_Recusada_DevolveProblemDetail() throws Exception {
        doThrow(new RegraDeNegocioException(HttpStatus.CONFLICT, "Você não pode excluir o seu próprio cadastro."))
                .when(funcionarioService).excluir(2, 2);

        mockMvc.perform(delete("/api/funcionarios/2").with(csrf()).with(user(GERENTE)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Você não pode excluir o seu próprio cadastro."));
    }
}
