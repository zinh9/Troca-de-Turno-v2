<!--#include file='conexao.asp' -->
<%

sub ResponseWriteJSON(success, code, message, horarioApresentacao, status)
    response.write "{"
    response.write " ""success"":""" & lcase(success) & ""","
    response.write " ""code"":""" & EscapeJSON(code) & ""","
    response.write " ""message"":""" & EscapeJSON(message) & ""","
    response.write " ""horarioApresentacao"":""" & FormatISOData(horarioApresentacao) & ""","
    response.write " ""status"":""" & EscapeJSON(status) & """"
    response.write "}"
    response.end
end sub

function buildJSONInfo(nome, att, ref)
    dim str
    str = "{"
    str = str & " ""nomeFormatado"":""" & EscapeJSON(nome) & ""","
    str = str & " ""ultimaAtualizacao"":""" & EscapeJSON(att) & ""","
    str = str & " ""horarioReferencia"":""" & EscapeJSON(ref) & """"
    str = str & " }"
    buildJSONInfo = str
end function

function buildJSONTabela(rs)
    dim str, count, status
    str = "["
    count = 0

    if not rs.eof then
        do while not rs.eof
            if count > 0 then str = str & ","
            
            str = str & "{"
            str = str & " ""matricula"":""" & rs("matricula") & ""","
            str = str & " ""nome"":""" & ucase(rs("nome")) & ""","
            str = str & " ""apresentacao"":""" & verifyDateTimeNullCorrect(rs("apresentacao")) & ""","
            str = str & " ""justificativaApresentacao"":""" & rs("justificativa_apresentacao") & ""","
            str = str & " ""horarioRef"":""" & rs("ref_horas") & ":" & rs("ref_minutos") & ""","
            str = str & " ""prontidao"":""" & verifyDateTimeNullCorrect(rs("prontidao")) & ""","
            str = str & " ""statusProntidao"":""" & rs("status") & ""","
            str = str & " ""justificativaProntidao"":""" & rs("justificativa_prontidao") & ""","
            str = str & " ""fimJornada"":""" & verifyDateTimeNullCorrect(rs("fim_jornada")) & """"
            str = str & "}"

            count = count + 1
            rs.MoveNext
        Loop
    end if

    str = str & "]"
    buildJSONTabela = str
end function

function verificarStatusFimJornada()

end function

function FormatISOData(dt)
    if isnull(dt) or not isdate(dt) then
        FormatISOData = ""
    else
        FormatISOData = year(dt) & "-" &_ 
        right("0" & month(dt), 2) & "-" & _
        right("0" & day(dt), 2) & "T" & _
        right("0" & hour(dt), 2) & ":" & _
        right("0" & minute(dt), 2) & ":" & _
        right("0" & second(dt), 2)
    end if
end function

function verifyDateTimeNullCorrect(value)
    if not isnull(value) then
        value = FormatDateTime(value, vbShortTime)
    else
        value = null
    end if

    verifyDateTimeNullCorrect = value
end function

function EscapeJSON(str)
    if isnull(str) then
        EscapeJSON = ""
    else
        str = replace(str, "\", "\\")
        str = replace(str, """", "\""")
        str = replace(str, vbcrlf, "\n")
        str = replace(str, vbcr, "\n")
        str = replace(str, vblf, "\n")
        str = replace(str, vbtab, "\t")

        EscapeJSON = str
    end if
end function

' Essa é uma função que fica nas telas do pátio (index.asp) e CCP (ccp.asp) para mostrar o horário do último registro em uma supervisão filtrada
function ultimaAtualizacao(torreFiltro)

    Dim conn, data_ultima_atualizacao, sql, strUltimaAtt
    Set conn = getConexao()

    If torreFiltro <> "" Then
        sql = "SELECT TOP 1 data_hora_apresentacao " & _
              "FROM registros_apresentacao " & _
              "WHERE supervisao_ra = '" & torreFiltro & "' AND (" & _
              "(DATEPART('h', data_hora_apresentacao) >= 5 AND DATEPART('h', data_hora_apresentacao) < 17) " & _
              "OR " & _
              "(DATEPART('h', data_hora_apresentacao) >= 17 OR DATEPART('h', data_hora_apresentacao) < 5)" & _
              ") " & _
              "ORDER BY data_hora_apresentacao DESC"
    Else
        sql = "SELECT TOP 1 data_hora_apresentacao " & _
              "FROM registros_apresentacao " & _
              "ORDER BY data_hora_apresentacao DESC"
    end If

    Set data_ultima_atualizacao = conn.Execute(sql)

    If Not data_ultima_atualizacao.EOF Then
        strUltimaAtt = FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbShortDate) & " " & FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbLongTime)
    Else
        strUltimaAtt = "--/--/-- --:--:--"
    end If

    ultimaAtualizacao = strUltimaAtt

end function

' Essa função é para reduzir o nome de cargos para deixar mais agradavel na tela
function reduzirNomeFuncao(cargo)

    select case cargo
        case "OFICIAL OPERACAO FERROVIARIA", "OFICIAL OP FERROV FORM PROFIS"
            cargo = "OOF"
        case "INSPETOR ORIENT OP FERROV ESP"
            cargo = "INSPETOR ESP"
        case "MAQUINISTA PATIO", "MAQUINISTA"
            cargo = "MAQ"
        case "TECNICO OPERACAO FERROVIARIA"
            cargo = "TOF"
        case "TRAINEE OPERACIONAL"
            cargo = "TRAINEE"
        case "INSPETOR ORIENT OP FERROV I"
            cargo = "INSPETOR I"
        case "INSPETOR ORIENT OP FERROV II"
            cargo = "INSPETOR II"
        case "OPERADOR LOCOMOTIVA REMOTO I"
            cargo = "MAQ REMOTO I"
        case "OPERADOR LOCOMOTIVA REMOTO II"
            cargo = "MAQ REMOTO II"
        case "TECNICO OPERACAO"
            cargo = "TO"
        case else
            cargo = cargo
    end select

    reduzirNomeFuncao = cargo

end function

function verificarTurno(turno)
    If (TimeValue(Now()) >= TimeSerial(4, 30, 0)) And (TimeValue(Now()) < TimeSerial(5, 40, 0)) and (turno <> "05x17") Then
        verificarTurno = "05x17"
    ElseIf (TimeValue(Now()) >= TimeSerial(5, 40, 0)) And (TimeValue(Now()) < TimeSerial(11, 40, 0)) and (turno <> "06x18") Then
        verificarTurno = "06x18"
    ElseIf (TimeValue(Now()) >= TimeSerial(11, 40, 0)) And (TimeValue(Now()) < TimeSerial(16, 40, 0)) and (turno <> "12x00") Then
        verificarTurno = "12x00"
    ElseIf (TimeValue(Now()) >= TimeSerial(16, 40, 0)) And (TimeValue(Now()) < TimeSerial(17, 40, 0)) and (turno <> "17x05") Then
        verificarTurno = "17x05"
    ElseIf (TimeValue(Now()) >= TimeSerial(17, 40, 0)) And (TimeValue(Now()) < TimeSerial(23, 40, 0)) and (turno <> "18x06") Then
        verificarTurno = "18x06"
    ElseIf (TimeValue(Now()) >= TimeSerial(23, 40, 0)) And (TimeValue(Now()) < TimeSerial(4, 30, 0)) and (turno <> "00x12") Then
        verificarTurno = "00x00"
    else
        verificarTurno = turno
    end If
end function

%>
