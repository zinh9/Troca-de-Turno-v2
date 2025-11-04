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

dim qsSup, qsLoc
dim conn, rsInfo, rsTabela
dim sqlInfo, sqlTabela

dim fso, jsonTabela, jsonInfo
set fso = server.CreateObject("Scripting.FileSystemObject")

qsSup = request.querystring("sup")
qsLoc = request.querystring("loc")

set conn = getConexao()

dim h_formatado, strNomeFormatado

sqlInfo = "SELECT * FROM horarios_referencia WHERE local_trabalho_ra = '" & qsLoc & "'"
set rsInfo = conn.execute(sqlInfo)

if not rsInfo.eof then
    h_formatado = rsInfo("ref_horas") & ":" & rsInfo("ref_minutos")
else
    h_formatado = "N/A"
end if

rsInfo.close
set rsInfo = nothing

if qsSup = "PV_AB" then
    strNomeFormatado = "VPN - " & replace(qsLoc, "_", " ")
else
    strNomeFormatado = replace(qsSup, "_", " ") & " - " & replace(qsLoc, "_", " ")
end if

dim strUltimaAtt

strUltimaAtt = ultimaAtualizacao(qsSup) ' Adicionar a função de utils para mostrar a ultima atualização

sqlTabela = _
"SELECT " & _
"ld.detalhe AS nome, " & _
"ld.usuario_dss AS matricula, " & _
"ra.data_hora_apresentacao AS apresentacao, " & _
"ra.data_hora_prontidao_ra AS prontidao, " & _
"ra.status_funcionario AS status, " & _
"ra.supervisao_ra AS sup, " & _
"ra.local_trabalho_ra AS local, " & _
"ra.justificativa_atraso_prontidao AS justificativa_prontidao, " & _
"ra.justificativa_atraso_apresentacao AS justificativa_apresentacao, " & _
"ld.horario_login_dss AS turno, " & _
"ra.data_hora_lanche_patio AS lanche, " & _
"ra.data_hora_lanche_CPT AS lanche_CPT, " & _
"ra.data_hora_refeicao_patio AS refeicao, " & _
"ra.data_hora_refeicao_CPT AS refeicao_CPT, " & _
"ra.justificativa_atraso_fim_jornada, " & _
"ra.fim_jornada, " & _
"hr.ref_horas, " & _
"hr.ref_minutos, " & _
"DateAdd('n', hr.ref_horas*60 + hr.ref_minutos, DateValue(ra.data_hora_apresentacao)) AS dataReferencia " & _
"FROM (registros_apresentacao ra " & _
"INNER JOIN login_dss ld ON ra.usuario_dss = ld.usuario_dss) " & _
"INNER JOIN horarios_referencia hr ON ra.local_trabalho_ra = hr.local_trabalho_ra AND ld.horario_login_dss = hr.turno_funcionario " & _
"WHERE ((DateValue(ra.data_hora_apresentacao) = Date() AND TimeValue(ra.data_hora_apresentacao) <= #23:59:59#) " & _
"OR (DateValue(ra.data_hora_apresentacao) = Date() - 1 AND TimeValue(ra.data_hora_apresentacao) >= #00:00:00#)) "

' Condição que verifica se o filtro de torre foi passado no parametro e concatena com o SQL com um AND
If qsSup <> "" Then
    sqlTabela = sqlTabela & "AND ra.supervisao_ra = '" & qsSup & "' "
End If

' Condição que verifica se o guarita de torre foi passado no parametro e concatena com o SQL com um AND
If qsLoc <> "" Then
    sqlTabela = sqlTabela & "AND ra.local_trabalho_ra = '" & qsLoc & "' "
End If

' Concatenar com o SQL para trazer o registro mais recente
sqlTabela = sqlTabela & "ORDER BY ra.data_hora_apresentacao DESC;"

set rsTabela = conn.execute(sqlTabela)

jsonInfo = buildJSONInfo(strNomeFormatado, strUltimaAtt, h_formatado)
jsonTabela = buildJSONTabela(rsTabela)

rsTabela.close
set rsTabela = nothing
conn.close
set conn = nothing

response.write "{""success"":true,""info"":" & jsonInfo & ", ""empregados"":" & jsonTabela & "}"
response.end
%>
