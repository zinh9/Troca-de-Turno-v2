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

dim matricula, justificativa, status, horarioProntidao, turno, data_hora_turno
dim conn, sql, rs, success, message

matricula = request.form("matricula")
justificativa = request.form("justificativaProntidao")
turno = request.form("turno")

success = "false"
message = ""
horarioProntidao = now()

if justificativa = "" or isnull(justificativa) then
    status = "Pronto"
else
    status = "Pronto com atraso"
end if

if turno <> "" then
    ' Se o case cair em algum dos turno ele formata a variavel que vai ser adicionada na consulta
    select case turno
        case "06x18"
            ' EX: o formato DateValue vai pegar apenas a data da apresentação e vai concatenar com TimeValue no valor pontual de 06:00:00
            data_hora_turno = "(DateValue(data_hora_apresentacao) + TimeValue('06:00:00'))"
        case "18x06"
            data_hora_turno = "(DateValue(data_hora_apresentacao) + TimeValue('18:00:00'))"
        case "12x00"
            data_hora_turno = "(DateValue(data_hora_apresentacao) + TimeValue('12:00:00'))"
        case "05x17"
            data_hora_turno = "(DateValue(data_hora_apresentacao) + TimeValue('17:00:00'))"
        case "17x05"
            data_hora_turno = "(DateValue(data_hora_apresentacao) + TimeValue('05:00:00'))"
        case else
            data_hora_turno = "(data_hora_apresentacao)"
    end select
end if

on error resume next

set conn = getConexao()

sql = "UPDATE registros_apresentacao SET " & _
"data_hora_prontidao_ra = now(), " & _
"status_funcionario = '" & status & "', " & _
"justificativa_atraso_prontidao = '" & justificativa & "', " & _
"tempo_apresentacao_prontidao_min = DateDiff('n', data_hora_apresentacao, Now()), " & _
"tempo_horario_exato_prontidao_min = DateDiff('n', " & data_hora_turno & ", Now()) " & _
"WHERE usuario_dss = '" & matricula & "' " & _
"AND data_hora_prontidao_ra IS NULL " & _
"AND DateValue(data_hora_apresentacao) = Date()"
conn.execute(sql)

if err.number <> 0 then
    success = "false"
    message = "Erro ao registrar prontidão!"
else
    success = "true"
    message = "Prontidão registrada com sucesso!"
end if

on error goto 0

conn.close
set conn = nothing

response.write "{""success"":" & lcase(success) & ",""message"":""" & message & """}"
response.end
%>