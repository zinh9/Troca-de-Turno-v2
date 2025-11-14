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

on error resume next

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

dim sqlCounts
sqlCounts = "SELECT " & _
    "  ra_inner.local_trabalho_ra, " & _
    "  COUNT(*) AS totalNoLocal, " & _
    "  SUM(IIF(ra_inner.data_hora_lanche_patio IS NOT NULL AND Hour(ra_inner.data_hora_lanche_patio) < 12, 1, 0)) AS lancheManhaCount " & _
    "FROM registros_apresentacao AS ra_inner " & _
    "WHERE DateValue(ra_inner.data_hora_apresentacao) >= Date() - 1 " & _
    "  AND Now() <= DateAdd('n', 870, ra_inner.data_hora_apresentacao) "

If qsSup <> "" Then
    sqlCounts = sqlCounts & "AND ra_inner.supervisao_ra = '" & qsSup & "' "
End If

sqlCounts = sqlCounts & "GROUP BY ra_inner.local_trabalho_ra"

sqlTabela = _
"SELECT " & _
"  ld.detalhe AS nome, " & _
"  ld.usuario_dss AS matricula, " & _
"  ra.supervisao_ra AS sup, " & _
"  ra.local_trabalho_ra AS local, " & _
"  ld.horario_login_dss AS turno, " & _
"  Format(ra.data_hora_apresentacao, 'hh:nn') AS apresentacao, " & _
"  ra.data_hora_apresentacao AS dataHoraApresentacaoCompleta, " & _
"  ra.justificativa_atraso_apresentacao AS justificativaApresentacao, " & _
"  Format(ra.data_hora_prontidao_ra, 'hh:nn') AS prontidao, " & _
"  ra.status_funcionario AS statusProntidao, " & _
"  ra.justificativa_atraso_prontidao AS justificativaProntidao, " & _
"  ra.data_hora_lanche_patio AS lanche, " & _
"  ra.data_hora_refeicao_patio AS refeicao, " & _
"  Format(ra.fim_jornada, 'hh:nn') AS fimJornada, " & _
"  ra.justificativa_atraso_fim_jornada AS justificativaFimJornada, " & _
"  ra.chamada_CPT, " & _
"  ra.fim_jornada_CPT, " & _
"  IIF(ra.fim_jornada IS NULL, IIF(DateDiff('n', DateAdd('h', 12, ra.data_hora_apresentacao), Now()) > 1, true, false), false) AS statusFimJornada, " & _
"  IIF(ld.JOB_DESC='OFICIAL OPERACAO FERROVIARIA' OR ld.JOB_DESC='OFICIAL OP FERROV FORM PROFIS', 'OOF', IIF(ld.JOB_DESC='INSPETOR ORIENT OP FERROV ESP', 'INSPETOR ESP', IIF(ld.JOB_DESC='MAQUINISTA PATIO' OR ld.JOB_DESC='MAQUINISTA', 'MAQ', IIF(ld.JOB_DESC='TECNICO OPERACAO FERROVIARIA', 'TOF', IIF(ld.JOB_DESC='TRAINEE OPERACIONAL', 'TRAINEE', IIF(ld.JOB_DESC='INSPETOR ORIENT OP FERROV I', 'INSPETOR I', IIF(ld.JOB_DESC='INSPETOR ORIENT OP FERROV II', 'INSPETOR II', IIF(ld.JOB_DESC='OPERADOR LOCOMOTIVA REMOTO I', 'MAQ REMOTO I', IIF(ld.JOB_DESC='OPERADOR LOCOMOTIVA REMOTO II', 'MAQ REMOTO II', IIF(ld.JOB_DESC='TECNICO OPERACAO', 'TO', ld.JOB_DESC)))))))))) AS cargo, " & _
"  Counts.totalNoLocal, " & _
"  Counts.lancheManhaCount, " & _
"  CInt(IIF(Counts.totalNoLocal Mod 2 = 0, Counts.totalNoLocal / 2, (Counts.totalNoLocal - 1) / 2 + 1)) AS metadeTurma " & _
"FROM (registros_apresentacao AS ra " & _
"LEFT JOIN login_dss AS ld ON ra.usuario_dss = ld.usuario_dss) " & _
"LEFT JOIN (" & sqlCounts & ") AS Counts ON ra.local_trabalho_ra = Counts.local_trabalho_ra " & _
"WHERE ra.data_hora_apresentacao >= Date() - 1 " & _
"  AND Now() <= DateAdd('n', 870, ra.data_hora_apresentacao) "

If qsSup <> "" Then
    sqlTabela = sqlTabela & "AND ra.supervisao_ra = '" & qsSup & "' "
End If

If qsLoc <> "" Then
    sqlTabela = sqlTabela & "AND ra.local_trabalho_ra = '" & qsLoc & "' "
End If


' Concatenar com o SQL para trazer o registro mais recente
sqlTabela = sqlTabela & "ORDER BY ra.data_hora_apresentacao DESC;"

' response.write sqlTabela & "<br>"

set rsTabela = conn.execute(sqlTabela)

jsonInfo = buildJSONInfo(strNomeFormatado, strUltimaAtt, h_formatado)
jsonTabela = buildJSONTabela(rsTabela)

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

rsTabela.close
set rsTabela = nothing
conn.close
set conn = nothing

on error goto 0

response.write "{""success"":true,""info"":" & jsonInfo & ", ""empregados"":" & jsonTabela & "}"
response.end
%>