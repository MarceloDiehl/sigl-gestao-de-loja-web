package com.sigl.sigl.controller;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Cliente;
import com.sigl.sigl.model.apoio.Cargo;
import com.sigl.sigl.repository.ClienteRepository;
import com.sigl.sigl.seguranca.UsuarioLogado;
import com.sigl.sigl.service.ClienteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClienteController.class)
class ClienteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClienteRepository clienteRepository;

    @MockitoBean
    private ClienteService clienteService;

    private static final UsuarioLogado GERENTE = new UsuarioLogado(2, "g@orion", null, "Gê", "Rente", Cargo.GERENTE, "Gerente");
    private static final UsuarioLogado VENDEDOR = new UsuarioLogado(1, "v@orion", null, "Vê", "Ndedor", Cargo.VENDEDOR, "Vendedor");

    private Cliente juliana;

    @BeforeEach
    void cadastrarCliente() {
        juliana = new Cliente();
        juliana.setId(1);
        juliana.setNome("Juliana");
        juliana.setCpf("529.982.247-25");
        juliana.setRg("1098765432");
        juliana.setDataNascimento(LocalDate.of(1991, 4, 17));
        juliana.setEndereco("Rua da República");
        juliana.setCep("90050-320");
        juliana.setCidade("Porto Alegre");
        juliana.setTelefone("(51) 99812-4410");
        when(clienteRepository.findAll()).thenReturn(List.of(juliana));
        when(clienteRepository.findByCpfContaining(anyString())).thenReturn(List.of(juliana));
    }

    @Test
    @DisplayName("Gerente recebe a ficha completa do cliente")
    void gerente_RecebeFichaCompleta() throws Exception {
        mockMvc.perform(get("/api/clientes").with(user(GERENTE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cpf").value("529.982.247-25"))
                .andExpect(jsonPath("$[0].rg").value("1098765432"))
                .andExpect(jsonPath("$[0].endereco").value("Rua da República"));
    }

    @Test
    @DisplayName("Vendedor recebe CPF mascarado e nem RG, nascimento ou endereço")
    void vendedor_RecebeFichaResumida() throws Exception {
        mockMvc.perform(get("/api/clientes").with(user(VENDEDOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Juliana"))
                .andExpect(jsonPath("$[0].telefone").value("(51) 99812-4410"))
                .andExpect(jsonPath("$[0].cpf").value("***.982.247-**"))
                .andExpect(jsonPath("$[0].rg").doesNotExist())
                .andExpect(jsonPath("$[0].dataNascimento").doesNotExist())
                .andExpect(jsonPath("$[0].endereco").doesNotExist())
                .andExpect(jsonPath("$[0].cep").doesNotExist());
    }

    @Test
    @DisplayName("Vendedor buscando por parte do CPF não recebe nada (não dá para deduzir os dígitos ocultos)")
    void vendedor_BuscaParcial_NaoTrazNada() throws Exception {
        mockMvc.perform(get("/api/clientes").param("cpf", "529.98").with(user(VENDEDOR)))
                .andExpect(jsonPath("$.length()").value(0));
        verify(clienteRepository, never()).findByCpfContaining(anyString());
    }

    @Test
    @DisplayName("Vendedor encontra o cliente pelo CPF completo, que volta mascarado")
    void vendedor_BuscaPorCpfCompleto() throws Exception {
        mockMvc.perform(get("/api/clientes").param("cpf", "529.982.247-25").with(user(VENDEDOR)))
                .andExpect(jsonPath("$[0].nome").value("Juliana"))
                .andExpect(jsonPath("$[0].cpf").value("***.982.247-**"));
        verify(clienteRepository).findByCpfContaining("529.982.247-25");
    }

    @Test
    @DisplayName("Gerente busca por qualquer parte do CPF, direto no banco")
    void gerente_BuscaParcialNoBanco() throws Exception {
        mockMvc.perform(get("/api/clientes").param("cpf", "529.98").with(user(GERENTE)))
                .andExpect(jsonPath("$[0].cpf").value("529.982.247-25"));
        verify(clienteRepository).findByCpfContaining("529.98");
        verify(clienteRepository, never()).findAll();
    }

    @Test
    @DisplayName("CPF repetido: 409 com o campo cpf, para a tela marcar o campo")
    void cadastrar_CpfRepetido_DevolveCampo() throws Exception {
        when(clienteService.salvar(any())).thenThrow(
                new RegraDeNegocioException(HttpStatus.CONFLICT, "Já existe um cliente com este CPF.", "cpf"));

        mockMvc.perform(post("/api/clientes").with(csrf()).with(user(VENDEDOR))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"cpf\": \"529.982.247-25\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.campos.cpf").value("Já existe um cliente com este CPF."));
    }
}
