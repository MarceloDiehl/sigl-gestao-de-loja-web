package com.sigl.sigl.service;

import com.sigl.sigl.exception.RegraDeNegocioException;
import com.sigl.sigl.model.Cliente;
import com.sigl.sigl.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock
    private ClienteRepository clienteRepository;

    private ClienteService clienteService;
    private Cliente cliente;

    @BeforeEach
    void preparar() {
        clienteService = new ClienteService(clienteRepository, new ValidatorService());
        cliente = new Cliente();
        cliente.setCpf("529.982.247-25");
        cliente.setCep("90050-320");
        cliente.setTelefone("(51) 99812-4410");
    }

    @Test
    @DisplayName("Recusa CPF já cadastrado (409), apontando o campo")
    void salvar_CpfRepetido_Recusa() {
        when(clienteRepository.existsByCpf("529.982.247-25")).thenReturn(true);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> clienteService.salvar(cliente));
        assertEquals(HttpStatus.CONFLICT, erro.getStatus());
        assertEquals("cpf", erro.getCampo());
        verify(clienteRepository, never()).save(any());
    }

    @Test
    @DisplayName("CPF novo é cadastrado")
    void salvar_CpfNovo_Salva() {
        when(clienteRepository.existsByCpf("529.982.247-25")).thenReturn(false);

        clienteService.salvar(cliente);

        verify(clienteRepository).save(cliente);
    }

    @Test
    @DisplayName("Cliente inexistente: 404, sem tentar excluir")
    void excluir_Inexistente_Devolve404() {
        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> clienteService.excluir(99));
        assertEquals(HttpStatus.NOT_FOUND, erro.getStatus());
        verify(clienteRepository, never()).deleteById(any());
    }
}
