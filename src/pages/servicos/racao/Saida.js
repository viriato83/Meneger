import Header from "../../../components/Header";
import Conteinner from "../../../components/Conteinner";
import Slider from "../../../components/Slider";
import Content from "../../../components/Content";
import Footer from "../../../components/Footer";
import Mensagem from "../../../components/mensagem";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Select from "react-select";
import repositorioRacao from "./repositorio";
import { Racao } from "./racao";

export default function Registar_saida() {
  const { id } = useParams();
  const [RacaoList, setRacaoList] = useState([]);
  const [inputs, setInputs] = useState({
    racao: [],
    quantidade: [],
    data_saida: "",
    destino:"",
    valor_uni: [],
  });
  const repositorio = new repositorioRacao();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    async function lerDados() {
      setRacaoList(await repositorio.leitura());
    }
    lerDados();
    setMsg(new Mensagem());
  }, []);

  // 🔹 Agrupar rações por data de entrada (igual antes)
  function agruparPorData() {
    const agrupado = {};
    RacaoList.filter((r) => r.quantidade_disp > 0).forEach((r) => {
      if (!agrupado[r.data_entrada]) agrupado[r.data_entrada] = [];
      agrupado[r.data_entrada].push({
        label: `${r.tipo} :: ${r.quantidade_disp} un.`,
        value: r.idracao,
      });
    });

    return Object.keys(agrupado).map((data) => ({
      label: `Data: ${data}`,
      options: agrupado[data],
    }));
  }

  const limparFormulario = () => {
    setInputs({
      racao: [],
      quantidade: [],
      data_saida: "",
      destino:"",
      valor_uni: [],
    });
  };

  // 🔹 Cadastrar saídas (similar ao de vendas)
  const cadastrar = async () => {
    if (!repositorio || !msg) return;

    if (
      !inputs.racao.length ||
      !inputs.quantidade.length ||
      !inputs.data_saida ||
      !inputs.destino
    ) {
      msg.Erro("Preencha todos os campos obrigatórios!");
      return;
    }

    try {
      for (let i = 0; i < inputs.racao.length; i++) {
        const idRacao = inputs.racao[i];
        const quantidade = parseFloat(inputs.quantidade[i] || 0);
        const valor_uni = parseFloat(inputs.valor_uni[i] || 0);

        const racaoSelecionada = RacaoList.find((e) => e.idracao == idRacao);
        if (!racaoSelecionada) continue;

        const novaQtdDisp =
          Number(racaoSelecionada.quantidade_disp) - quantidade;
        const novaQtdSaida =
          Number(racaoSelecionada.quantidade_saida) + quantidade;

        await repositorio.editar({
          idracao: idRacao,
          quantidade_saida: novaQtdSaida,
          quantidade_disp: novaQtdDisp,
          data_saida: inputs.data_saida,
          valor_uni: valor_uni,
        });
      }

      msg.sucesso("Saída registrada com sucesso!");
      limparFormulario();
    } catch (error) {
      console.error(error);
      msg.Erro("Erro ao registrar saída!");
    }
  };

  return (
    <>
      <Header />
      <Conteinner>
        <Slider />
        <Content>
          <div className="Cadastro">
            <h1>Registro de Saída de Ração</h1>
            <br />

            <div className="form">
              <label>ID:</label>
              <input type="number" value={id ? id : 0} disabled className="id" />
              <br />

              <label>Selecione as Rações:</label>
              <Select
                isMulti
                placeholder="Selecione as rações"
                options={agruparPorData()}
                value={agruparPorData()
                  .flatMap((g) => g.options)
                  .filter((opt) => inputs.racao.includes(opt.value))}
                onChange={(selectedOptions) =>
                  setInputs({
                    ...inputs,
                    racao: selectedOptions.map((option) => option.value),
                  })
                }
              />
              <br />

              <label>Data de Saída:</label>
              <input
                type="date"
                required
                className="data_saida"
                value={inputs.data_saida}
                onChange={(e) =>
                  setInputs({ ...inputs, data_saida: e.target.value })
                }
              />
              <br />
              {/* <label>Destino:</label>
              <input
                type="text"
                required
                className="destino"
                placeholder="Destino"
                value={inputs.destino}
                onChange={(e) =>
                  setInputs({ ...inputs, destino: e.target.value })
                }
              />
              <br /> */}
              

              {/* 🔹 Campos dinâmicos para cada ração selecionada */}
              <div>
                {inputs.racao.map((id, index) => {
                  const racaoSelecionada = RacaoList.find(
                    (r) => r.idracao == id
                  );
                  return (
                    <div
                      key={id}
                      style={{
                        marginBottom: "10px",
                        borderBottom: "1px solid #ccc",
                        paddingBottom: "10px",
                      }}
                    >
                      <span>
                        {racaoSelecionada?.tipo || "Ração"} (
                        {racaoSelecionada?.quantidade_disp} disp.)
                      </span>
                      <br />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Quantidade a sair"
                        value={inputs.quantidade?.[index] || ""}
                        onChange={(e) => {
                          const novaQuantidade = [...(inputs.quantidade || [])];
                          novaQuantidade[index] = e.target.value;
                          setInputs({
                            ...inputs,
                            quantidade: novaQuantidade,
                          });
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor unitário (MZN)"
                        value={inputs.valor_uni?.[index] || ""}
                        onChange={(e) => {
                          const novosValores = [...(inputs.valor_uni || [])];
                          novosValores[index] = e.target.value;
                          setInputs({ ...inputs, valor_uni: novosValores });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={cadastrar} className="cadastrar">
              Cadastrar
            </button>
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
