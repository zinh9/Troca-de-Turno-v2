<%@ Language=VBScript %>
<!--#include file='includes/conexao.asp'-->
<!--#include file='includes/utils.asp'-->
<%
response.charset = "UTF-8"
response.codepage = 65001
response.contenttype = "application/json"

response.cachecontrol = "no-cache"
response.addheader "Pragma", "no-cache"
response.expires = -1

dim matricula, filtroMes
dim conn, rsInfo, sqlInfo, rsApresentacoes, sqlApresentacoes
dim jsonInfoEmpregado, jsonApresentacoes

matricula = request.querystring("mat")
filtroMes = request.querystring("mes")

if matricula = "" or isnull(matricula) then
    response.write "{""success"":""false"", ""message"":""Matrícula vázia!""}"
    response.end
end if

on error resume next

set conn = getConexao()

sqlInfo = _
"SELECT " & _
"   detalhe AS nome, " & _
"   JOB_DESC AS cargo, " & _
"   horario_login_dss AS turno, " & _
"   supervisao, " & _
"   Gerencia " & _
"FROM " & _
"   login_dss " & _
"WHERE " & _
"   usuario_dss = '" & matricula & "' "

set rsInfo = conn.execute(sqlInfo)

sqlApresentacoes = _
"SELECT " & _
"   supervisao_ra AS sup, " & _
"   local_trabalho_ra AS local, " & _
"   Format(data_hora_apresentacao, 'hh:nn') AS apresentacao, " & _
"   status_apresentacao AS statusApresentacao, " & _
"   data_hora_apresentacao AS dataHoraApresentacaoCompleta, " & _
"   justificativa_atraso_apresentacao AS justificativaApresentacao, " & _
"   Format(data_hora_prontidao_ra, 'hh:nn') AS prontidao, " & _
"   status_funcionario AS statusProntidao, " & _
"   justificativa_atraso_prontidao AS justificativaProntidao, " & _
"   Format(data_hora_lanche_patio, 'hh:nn') AS lanche, " & _
"   escolha_lanche_intervalo AS intervaloLanche, " & _
"   justificativa_atraso_lanche AS justificativaLanche, " & _
"   Format(data_hora_refeicao_patio, 'hh:nn') AS refeicao, " & _
"   justificativa_atraso_refeicao AS justificativaRefeicao, " & _
"   Format(fim_jornada, 'hh:nn') AS fimJornada, " & _
"   justificativa_atraso_fim_jornada AS justificativaFimJornada " & _
"FROM registros_apresentacao " & _
"   WHERE usuario_dss = '" & matricula & "' "

if filtroMes = "" or isnull(filtroMes) then
    sqlApresentacoes = sqlApresentacoes & "AND Month(DateValue(data_hora_apresentacao)) = Month(Date()) "
else
    sqlApresentacoes = sqlApresentacoes & "AND Month(DateValue(data_hora_apresentacao)) = " & filtroMes & " "
end if

sqlApresentacoes = sqlApresentacoes & "ORDER BY data_hora_apresentacao DESC"

set rsApresentacoes = conn.execute(sqlApresentacoes)

' response.write sqlApresentacoes

jsonInfoEmpregado = buildJSONHistorico(rsInfo)
jsonApresentacoes = buildJSONHistorico(rsApresentacoes)

if err.number <> 0 then
    message = "Erro na consulta do banco: " & err.description
    response.write message
else
    if not rsTabela is nothing then
        if rsTabela.state = 1 then ' 1 = aberto
            rsTabela.close
        end if
    end if
    if not conn is nothing then
        if conn.state = 1 then
            conn.close
        end if
    end if
end if

rsInfo.close
set sqlInfo = nothing
rsApresentacoes.close
set sqlApresentacoes = nothing

on error goto 0

response.write "{""success"":true,""infoEmp"":" & jsonInfoEmpregado & ", ""apresentacoes"":[" & jsonApresentacoes & "]}"
' response.end

%>