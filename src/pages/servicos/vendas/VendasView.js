import { useEffect, useState, useRef } from "react";
import Header from "../../../components/Header";
import Conteinner from "../../../components/Conteinner";
import Slider from "../../../components/Slider";
import Content from "../../../components/Content";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../../components/modal";
import Mensagem from "../../../components/mensagem";
import Footer from "../../../components/Footer";
import { repositorioVenda } from "./vendasRepositorio";
import Loading from "../../../components/loading";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import ClienteRepository from "../Clientes/ClienteRepository";
import repositorioStock from "../Stock.js/Repositorio";
import repositorioMercadoria from "../Mercadorias/Repositorio";

import "./VendasView.css"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { IoMdArrowRoundBack, IoMdPrint } from "react-icons/io";
import { FaFileInvoice } from "react-icons/fa";

export default function VendasView() {
  const repositorio = new repositorioVenda();
  const repoStco= new repositorioStock()
  const repositorioMerc= new repositorioMercadoria()
  const [modelo, setModelo] = useState([]);
  const [modelo2, setModelo2] = useState([]);
  const [total, setTotal] = useState(0);
  const [quantidadeTotal, setQuantidadeTotal] = useState(0);
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const repositorioClient= new ClienteRepository()
  const msg = useRef(null);
  const moda = useRef(null);
  const [stockSelecionado,setLoteS] = useState(0);
  const [mesSelecionado, setMesSelecionado] = useState("");

  const[Item,setItem]=useState([])

  const [totalDivida, setTotalDivida] = useState(0);
  const [quantiDivida,setQuantiDivida] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
const [mensagem, setMensagem] = useState("");
const [clienteParaPagar, setClienteParaPagar] = useState(null);
const[Data,setData]=useState("")
const handlePagarClick = (elemento) => {
  setMensagem(`Deseja validar o pagamento do ${elemento.cliente.nome}?`);
  setClienteParaPagar(elemento);
  setModalOpen(true);
};

const confirmarPagamento = async () => {
  try {
    await pagar(clienteParaPagar.cliente.idclientes, clienteParaPagar.idvendas);

  } catch (err) {
    console.error("Erro ao pagar:", err);
    alert("Erro ao efetuar pagamento.");
  } finally {
    setModalOpen(false);
    window.location.reload(); // Só recarrega após conclusão
  }
};

 
  useEffect(() => {
    msg.current = new Mensagem();
    moda.current = new Modal();
    
    async function carregarDados() {
      setLoading(true);
      try {
        const dadosModelo = await repositorio.leitura();
        const repositoriomerc = await repositorioMerc.leitura();
        const repoStck = await repoStco.leitura();
    
        const dadosTotal = await repositorio.total();
        const quantidadeTotalVendas = dadosModelo.reduce((acc, venda) => acc + venda.valor_total, 0);
        var valorTotalVendas = 0
        var quantidadeTotal = 0;
        var quantidadeTotal2 = 0;
        var quantidadeDivida= 0;
      console.log(totalDivida)

        dadosModelo.forEach((e) => {
          
          const dataMercadoria = new Date(e.data);
          const anoMes = `${dataMercadoria.getFullYear()}-${String(dataMercadoria.getMonth() + 1).padStart(2, '0')}`;
          
         
              e.mercadorias.forEach((o) => {
            
            
            
                if ( (!mesSelecionado || anoMes === mesSelecionado)&&(!stockSelecionado|| (stockSelecionado && stockSelecionado == o.stock.idstock))) {
                    setData(anoMes)
                      if (e.status_p == "Em_Divida") {
                        e.itensVenda.forEach((item) => {
                          quantidadeTotal2 += item.quantidade;
                          quantidadeDivida += e.valor_total;
                        })
                      }else{
                        e.itensVenda.forEach((item) => {
                            quantidadeTotal +=item.quantidade;
                    
                            valorTotalVendas += e.valor_total;
                        })
                    
                      }
              
                  } 
                
              });
            });
        setModelo2(repoStck)
 
        setQuantiDivida(quantidadeDivida);
        setModelo(dadosModelo);
        setTotal(quantidadeTotal);
        setTotalDivida(quantidadeTotal2);
        setQuantidadeTotal(valorTotalVendas);
        localStorage.setItem('quantidadeVendas', quantidadeTotal.toString());
        localStorage.setItem('valorTotalVendas', JSON.stringify(valorTotalVendas));
        localStorage.setItem('quantidadeVendasD', quantidadeTotal2.toString());
        localStorage.setItem('valorTotalVendasD', JSON.stringify(quantidadeDivida));
      
      } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        msg.current.Erro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
   

    carregarDados();
  }, [stockSelecionado,mesSelecionado]);

  const exportarParaExcel = () => {
    const dados = [];
  
    modelo.forEach((venda) => {
      venda.itensVenda.forEach((item, idx) => {
        const mercadoria = venda.mercadorias[idx];
  
        dados.push({
          ID: venda.idvendas,
          Quantidade: item.quantidade,
          "Valor Unitário": item.valor_uni,
          Data: venda.data,
          "Valor Total": item.quantidade * item.valor_uni,
          Cliente: venda.cliente.nome,
          Mercadoria: mercadoria
            ? `${mercadoria.idmercadoria} : ${mercadoria.nome}`
            : "",
        });
      });
    });
  
    // Linha total pago
    dados.push({
      ID: "TOTAL",
      Quantidade: total,
      "Valor Unitário": "",
      Data: "",
      "Valor Total": quantidadeTotal,
      Cliente: "",
      Mercadoria: "",
    });
  
    // Linha total em dívida
    dados.push({
      ID: "TOTALDivida",
      Quantidade: totalDivida,
      "Valor Unitário": "",
      Data: "",
      "Valor Total": quantiDivida,
      Cliente: "",
      Mercadoria: "",
    });
  
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "relatorio_vendas.xlsx");
  };
  
  async function pagar(id,id2){
    await repositorioClient.editar2(id,"Pago")
    await repositorio.editar2(id2,"Pago")

  }
  const permissao = sessionStorage.getItem("cargo");


  const carregarImagem = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = src;
    });
  
    const gerarPDF = async () => {
      const doc = new jsPDF("p", "mm", "a4"); // A4 vertical
      const vendasFiltradas = modelo.filter((elemento) => {
        const dataVenda = new Date(elemento.data);
        const anoMes = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, "0")}`;
        return (!mesSelecionado || anoMes === mesSelecionado) &&
               (!stockSelecionado || elemento.mercadorias.some((e) => e.stock.idstock == stockSelecionado));
      });
    
      const logo = await carregarImagem("/logo_white-removebg2.png");
    
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
    
      const larguraFatura = pageWidth / 2 - 10; // margem de 5mm
      const alturaFatura = pageHeight / 2 - 10;
    
      for (let i = 0; i < vendasFiltradas.length; i++) {
        const venda = vendasFiltradas[i];
        const indexNaPagina = i % 4; // 4 faturas por página
        const coluna = indexNaPagina % 2;
        const linha = Math.floor(indexNaPagina / 2);
    
        const startX = 10 + coluna * (larguraFatura + 5); // margem de 5mm
        const startY = 10 + linha * (alturaFatura + 5);
    
        // Cabeçalho
        doc.addImage(logo, "PNG", startX, startY, 20, 10);
        doc.setFontSize(9);
        const empresaInfo = `Aquafish Sociedade Unipessoal, Lda
    Bairro Nove, Distrito de Zavala
    +258 84 2446503
    NUIT: 401232125`;
        empresaInfo.split("\n").forEach((linhaTexto, j) => {
          doc.text(linhaTexto, startX + 25, startY + 4 + j * 4);
        });
    
        doc.setFontSize(9);
        doc.text(`Factura VD Nº: ${venda.idvendas}`, startX, startY + 22);
        doc.text(`Data: ${venda.data}`, startX, startY + 26);
        doc.text(`Cliente: ${venda.cliente.nome}`, startX, startY + 30);
    
        // Tabela de mercadorias
        const tableData = venda.mercadorias.map((m, idx) => {
          const qtd = venda.itensVenda[idx]?.quantidade || 0;
          const valor = venda.itensVenda[idx]?.valor_uni || 0;
          return [m.nome, qtd.toString(), valor.toFixed(2), (qtd * valor).toFixed(2)];
        });
    
        autoTable(doc, {
          startY: startY + 34,
          margin: { left: startX },
          head: [["DESCRIÇÃO", "QTD", "P.UNIT", "TOTAL"]],
          body: tableData,
          styles: { fontSize: 8 },
          theme: "grid",
          tableWidth: larguraFatura,
          showHead: "firstPage",
        });
    
        const totalGeral = tableData.reduce((acc, row) => acc + parseFloat(row[3]), 0);
        const posTotal = doc.lastAutoTable.finalY + 2;
        doc.text(`Sub-Total: ${totalGeral.toFixed(2)} MZN`, startX, posTotal);
        doc.text(`IVA (Isento): 0.00 MZN`, startX, posTotal + 4);
        doc.text(`Total: ${totalGeral.toFixed(2)} MZN`, startX, posTotal + 8);
        doc.text(`Status: ${venda.status_p}`, startX, posTotal + 12);
    
        doc.setFontSize(7);
        doc.text("Documento processado por computador", startX + larguraFatura / 2, posTotal + 18, { align: "center" });
        doc.text("Obrigado pela preferência!", startX + larguraFatura / 2, posTotal + 22, { align: "center" });
    
        // Nova página a cada 4 faturas
        if (indexNaPagina === 3 && i !== vendasFiltradas.length - 1) {
          doc.addPage();
        }
      }
    
      doc.save("faturas_VD_2x2.pdf");
    };
    
    const logoBase64=`/logo_white-removebg2.png`
    async function imprimirFatura(id, cliente, data, mercadoria, quantidade, status_p) {
      const carregarImagem = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = reject;
          img.src = src;
        });
    
      const logoBase64 = await carregarImagem("/logo_white-removebg2.png");
    
      const faturaWindow = window.open("", "_blank");
    
      const totalGeral = mercadoria.reduce((soma, _, i) => {
        const qtd = Number(quantidade[i]?.quantidade || 0);
        const valor = Number(quantidade[i]?.valor_uni || 0);
        return soma + qtd * valor;
      }, 0);
    
      const numeroFatura = String(id).padStart(5, "0"); // Ex: VD00001
    
      faturaWindow.document.write(`
        <html>
          <head>
            <title>VD${numeroFatura} </title>
            <style>
                    body {
                      width: 58mm;
                      font-family: monospace;
                      font-size: 10px;
                      margin: 0;
                      padding: 0;
                      color: #000;
                    }
                    .container {
                      text-align: center;
                      padding: 5px;
                    }
                    img { width: 60px; margin-bottom: 3px; }
                    h3 { font-size: 12px; margin: 0; }
                    p { margin: 2px 0; }
                    .linha {
                      border-top: 1px dashed #000;
                      margin: 5px 0;
                    }
                    table {
                      width: 100%;
                      border-collapse: collapse;
                      font-size: 9px;
                    }
                    th, td {
                      text-align: left;
                      padding: 2px 0;
                    }
                    th { border-bottom: 1px dashed #000; }
                    td.right, th.right { text-align: right; }
                    .totais {
                      margin-top: 5px;
                      text-align: right;
                    }
                    .footer {
                      text-align: center;
                      font-size: 9px;
                      margin-top: 10px;
                    }
                  </style>
          </head>
          <body>
            <div class="container">
              <img src="${logoBase64}" alt="LifeMar Logo" />
              <h3><strong>Aquafish Sociedade Unipessoal, Lda</strong></h3>
              <p>Bairro Nove, Distrito de Zavala</p>
              <p>+258 82 244 6503</p>
              <p>NUIT: 401 232 125</p>
              <div class="linha"></div>
              <h4><strong>VENDA A DINHEIRO</strong></h4>
              <p><strong>Fatura Nº:</strong> VD${numeroFatura}</p>
              <p><strong>Data:</strong> ${data}</p>
              <p><strong>Cliente:</strong> ${cliente}</p>
              <div class="linha"></div>
              <table class="tabela">
                <thead>
                  <tr class="center">
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Preço</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${mercadoria.map((item, i) => {
                    const qtd = Number(quantidade[i]?.quantidade || 0);
                    const valor = Number(quantidade[i]?.valor_uni || 0);
                    const total = qtd * valor;
                    return `
                      <tr>
                        <td>${item.nome}</td>
                        <td class="center">${qtd}</td>
                        <td class="right">${valor.toFixed(2)}</td>
                        <td class="right">${total.toFixed(2)}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
              <div class="linha"></div>
              <table class="tabela">
                <tr>
                  <td colspan="3"><strong>Subtotal</strong></td>
                  <td class="right">${totalGeral.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3"><strong>IVA (Isento Art.º 9 CIVA)</strong></td>
                  <td class="right">0.00</td>
                </tr>
                <tr class="total">
                  <td colspan="3"><strong>Total Geral (MT)</strong></td>
                  <td class="right">${totalGeral.toFixed(2)}</td>
                </tr>
              </table>
              <div class="linha"></div>
              <p><strong>Status:</strong> ${status_p}</p>
              <div class="footer">
                <p>Documento processado por computador</p>
                <p>Obrigado pela sua preferência!</p>
              </div>
            </div>
          </body>
        </html>
      `);
    
      faturaWindow.document.close();
      faturaWindow.onload = () => faturaWindow.print();
    }
  
 
  
  return (
    <>
      {loading && <Loading />} 
      <Header />
      <Conteinner>
        <Slider />
        <Content>
       
        <Link to="/registarvenda" className="back_link">
        <IoMdArrowRoundBack  className="back"/> 
            Cadastro
        </Link>

        {/* {Filtro} */}
        <label>    Filtrar por Gaiola:</label>
         <img src=""></img>
          <select value={stockSelecionado} onChange={(e) => setLoteS(e.target.value)}>
          <option>Selecione Uma Giola</option>
            {modelo2.map((stock) => (
              <option key={stock.idstock} value={stock.idstock}>
                Stock {stock.tipo}
              </option>
            ))}
          </select>
          <label>Filtrar por Mês:</label>
        <input
          type="month"
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
          style={{ marginBottom: "1rem", display: "block" }}
        />
<button onClick={gerarPDF} className="btn btn-success" style={{ marginBottom: "1rem" }}>
  Baixar Facturas (PDF) <IoMdPrint></IoMdPrint>
</button>

          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Quantidade</th>
                  <th>Valor Unitário</th>
                  <th>Data</th>
                  <th>Valor Total</th>
                  <th>Cliente</th>
                  <th>Mercadorias</th>
                  <th>Status</th>
                  <th>Ações</th>
                  <th>Imprimir F</th>
                 
                 {(permissao === "admin" )&&
                            <th>Usuario</th>
                          }
                </tr>
              </thead>
              <tbody>
              {modelo.filter((elemento) =>{
                  const dataVenda = new Date(elemento.data);
                  const anoMes = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}`;
                  
              
                return  ( !mesSelecionado || anoMes === mesSelecionado) &&(!stockSelecionado || elemento.mercadorias.some((e) => e.stock.idstock == stockSelecionado))
                })
                .map((elemento, i) => {
                   let estado=""
                   if(elemento.status_p==="Pago"){
                    estado="bg-success p-2"
                  }
                  if(elemento.status_p==="Em_Divida"){
                    estado="bg-danger p-2"
                  }
                  if(elemento.status_p==="Pendente"){
                    estado="bg-warning p-2"
                  }
                  // console.log(elemento)
               
                        return (
                  
                            <tr key={i}>
                              <td>{elemento.idvendas}</td>
                              <td>{elemento.itensVenda.map(e=><p key={e.id}>{e.quantidade}</p>)} kg</td>
                              <td>{elemento.itensVenda.map(e=><p key={e.id}>{e.valor_uni}</p>)} Mt</td>
                              <td>{elemento.data}</td>
                              <td>
                                {elemento.valor_total.toLocaleString("pt-PT", {
                                  minimumFractionDigits: 3,
                                })} Mt
                              </td>
                              <td>{elemento.cliente.nome}</td>
                              <td>
                                {elemento.mercadorias.map((mercadoria) => `${mercadoria.idmercadoria} : ${mercadoria.nome}`).join(", ")}
                              </td>
                              <td><span className={estado}>{elemento.status_p}</span></td>
                              <>
                                    <td>
                                      {elemento.status_p === "Em_Divida" && (
                                        <button className="btn bg-success" onClick={() => handlePagarClick(elemento)}>Pagar</button>
                                      )}
                                    </td>

                                    {modalOpen && (
                                      <div className="modal">
                                        <div className="modal-content">
                                        <p>{mensagem}</p>
                                        <div class="buttons">
                                        <button className=" sim" onClick={confirmarPagamento}>Sim</button>
                                        <button className=" nao" onClick={() => setModalOpen(false)}>Não</button>
                                        </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                  <button className="btn btn-primary" onClick={()=>{imprimirFatura(elemento.idvendas,elemento.cliente.nome,elemento.data,elemento.mercadorias,elemento.itensVenda,elemento.status_p)}}><FaFileInvoice /></button>
                                  {(permissao === "admin" )&&
                                  <td>{elemento.usuario!=null?elemento.usuario.login:0}</td>
                               
                                  }
                            </tr>
                           
                           
                     ) })}
                    </tbody>
                    <tfoot>
                    <tr>
                      <td colSpan="4">Total Pago</td>
                      <td  >{total.toFixed(2)}</td>
                      <td>{quantidadeTotal.toLocaleString("pt-PT", { minimumFractionDigits: 3 })} Mt</td>
                    </tr>
                    <tr>
                      <td colSpan="4">Em dívida</td>
                      <td>{totalDivida.toFixed(2)}</td>
                      <td>{quantiDivida.toLocaleString("pt-PT", { minimumFractionDigits: 3 })} Mt</td>
                    </tr>

                    </tfoot>
                  
            </table>
            {(permissao === "admin" || permissao === "gerente") && (
              <div className="crud">
                <button className="editar" onClick={() => {
                  if (id) {
                    moda.current.Abrir("Deseja editar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => navigate(`/registar-venda/${id}`));
                    document.querySelector(".nao").addEventListener("click", () => moda.current.fechar());
                  } else {
                    msg.current.Erro("Por favor, digite um ID válido!");
                  }
                }}>
                  Editar
                </button>
                <input type="number" className="crudid" placeholder="Digite o ID" value={id} onChange={(e) => setId(e.target.value)} />
                <button onClick={() => {
                  if (id) {
                    moda.current.Abrir("Deseja apagar o " + id);
                    document.querySelector(".sim").addEventListener("click", () => {
                      repositorio.deletar(id);
                      moda.current.fechar();
                    });
                    document.querySelector(".nao").addEventListener("click", () => moda.current.fechar());
                  } else {
                    msg.current.Erro("Por favor, digite um ID válido!");
                  }
                }} className="apagar">
                  Apagar
                </button>
              </div>
            )}
            {permissao === "admin" && (
              <button onClick={exportarParaExcel} className="btn-export mt-3">
                Exportar Relatório Excel
              </button>
            )}
          </div>
        </Content>
      </Conteinner>
      <Footer />
    </>
  );
}
