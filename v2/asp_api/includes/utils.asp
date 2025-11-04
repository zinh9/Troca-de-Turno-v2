<!--#include file='conexao.asp' -->
<%

Dim acao
acao = request.QueryString("acao")

select case acao
    case "atualizarChamadaCPT"
        call atualizarChamadaCPT()
    case "fimJornadaCPT"
        call fimJornadaCPT()
    case "atualizarTurnoEmpregado"
        call atualizarTurnoEmpregado()
    case "atualizarLanche"
        call atualizarLanche()
    case "atualizarRefeicao"
        call atualizarRefeicao()
end select

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
    dim str, count
    str = "["
    count = 0

    if not rs.eof then
        do while not rs.eof
            if count > 0 then str = str & ","

            str = str & "{"
            str = str & " ""nome"":""" & rs("nome") & ""","
            str = str & " ""apresentacao"":""" & verifyDateTimeNullCorrect(rs("apresentacao")) & ""","
            str = str & " ""prontidao"":""" & verifyDateTimeNullCorrect(rs("prontidao")) & ""","
            str = str & " ""statusProntidao"":""" & rs("status") & ""","
            str = str & " ""fimJornada"":""" & verifyDateTimeNullCorrect(rs("fim_jornada")) & """"
            str = str & "}"

            count = count + 1
            rs.MoveNext
        Loop
    end if

    str = str & "]"
    buildJSONTabela = str
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

' Esse é um arquivo para colocar funções específicas para retornar um valor desejado (deveria usar mais)

' OBS: algumas funções não são retornadas, tendo apenas um Response.Write para "retornar" o valor.
' Mas outras pode colocar ela no nome exato da função para retornar.
' EX: formatDataHoraUSA = '04/23/2005 19:55:00'

' Essa função é para retornar um valor de data e hora no formato States of America, passando os parametros de data e hora
Function formatDataHoraUSA(data, hora)

    formatDataHoraUSA = "#" & Month(data) & "/" & Day(data) & "/" & Year(data) & " " & hora & "#"

End Function

' Essa função é para retornar um valor de data e hora no formato Brasilsil, passando os parametros de data e hora
Function formatDataHoraBR(data, hora)

    formatDataHoraBR = Day(data) & "/" & Month(data) & "/" & Year(data) & " " & hora

End Function

' Essa é uma função que fica nas telas do pátio (index.asp) e CCP (ccp.asp) para mostrar o horário do último registro em uma supervisão filtrada
Function ultimaAtualizacao(torreFiltro)

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
    End If

    Set data_ultima_atualizacao = conn.Execute(sql)

    If Not data_ultima_atualizacao.EOF Then
        strUltimaAtt = FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbShortDate) & " " & FormatDateTime(data_ultima_atualizacao("data_hora_apresentacao"), vbLongTime)
    Else
        strUltimaAtt = "--/--/-- --:--:--"
    End If

    ultimaAtualizacao = strUltimaAtt

End Function

' Essa função é para reduzir o nome de cargos para deixar mais agradavel na tela
Function reduzirNomeFuncao(cargo)

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

End Function

Function formatDateTimeJSON(hora)
    horarioFormatado = Year(Date()) & "-" & Right("0" & Month(Date()), 2) & "-" & Right("0" & Day(Date()), 2) & "T" & Right("0" & Hour(hora), 2) & ":" & Right("0" & Minute(hora), 2) & ":" & Right("0" & Second(Time()), 2)

    formatDateTimeJSON = horarioFormatado
End Function

Function redirectPatio(supervisao, local)
    response.redirect "index.asp?torre=" & Server.URLEncode(supervisao) & "&guarita=" & Server.URLEncode(local)
End Function

Function redirectCPT(supervisao)
    response.redirect "ccp.asp?torre=" & Server.URLEncode(supervisao)
End Function

Function atualizarChamadaCPT()

    Dim supervisao, matricula, chamada_CPT, conn
    set conn = getConexao

    supervisao = request.form("supervisao_ra")
    matricula = request.form("matricula")

    sql = "UPDATE registros_apresentacao " &_
    "SET chamada_CPT = Now() " &_
    "WHERE usuario_dss = '" & matricula & "' " &_
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1) " &_
    "AND chamada_CPT IS NULL"
    conn.Execute(sql)

    Response.Redirect "ccp.asp?torre=" & Server.URLEncode(supervisao)

End Function

Function fimJornadaCPT()

    Dim supervisao, matricula, conn
    set conn = getConexao

    supervisao = request.form("supervisao_ra")
    matricula = request.form("matricula")

    sql = "UPDATE registros_apresentacao " & _
    "SET fim_jornada_CPT = Now() " & _
    "WHERE usuario_dss = '" & matricula & "' " &_
    "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1) " &_
    "AND fim_jornada_CPT IS NULL"
    conn.Execute(sql)

    Response.Redirect "ccp.asp?torre=" & Server.URLEncode(supervisao)

End Function

Function selectTurnoHorario(turno)

    select case turno
        case "06x18"
            horario = TimeSerial(18, 0, 0)
        case "18x06"
            horario = TimeSerial(6, 0, 0)
        case "05x17"
            horario = TimeSerial(17, 0, 0)
        case "17x05"
            horario = TimeSerial(5, 0, 0)
        case "12x00"
            horario = TimeSerial(12, 0, 0)
        case else
            horario = TimeSerial(0, 0, 0)
    end select

    selectTurnoHorario = horario

End Function

Function atualizarTurnoEmpregado()
    dim matricula, turnoNovo, conn, supervisao, local
    set conn = getConexao()

    matricula = request.form("matricula")
    turnoNovo = request.form("turno")
    supervisao = request.form("supervisao")
    local = request.form("local")

    sql = "UPDATE login_dss SET horario_login_dss = '" & turnoNovo & "' WHERE usuario_dss = '" & matricula & "'"
    conn.execute(sql)

    response.redirect "index.asp?torre=" & Server.URLEncode(supervisao) & "&guarita=" & Server.URLEncode(local)
End Function

Function verificarTurno(turno)
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
    End If
End Function

Function atualizarLanche()
    dim matricula, conn, supervisao, local, acao
    set conn = getConexao()

    matricula = request.form("matricula")
    supervisao = request.form("supervisao_ra")
    local = request.form("local_trabalho_ra")
    acao = request.form("acao")

    select case acao
        case "patio"
            sql = "UPDATE registros_apresentacao " & _
            "SET data_hora_lanche_patio = Now() " & _
            "WHERE usuario_dss = '" & matricula & "' " & _
            "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
            conn.execute(sql)

            call redirectPatio(supervisao, local)

            exit function
        case "CCP"
            sql = "UPDATE registros_apresentacao " & _
            "SET data_hora_lanche_CPT = Now() " & _
            "WHERE usuario_dss = '" & matricula & "' " & _
            "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
            conn.execute(sql)

            call redirectCPT(supervisao)

            exit function
    end select

End Function

Function atualizarRefeicao()
    dim matricula, conn, supervisao, local, acao
    set conn = getConexao()

    matricula = request.form("matricula")
    supervisao = request.form("supervisao_ra")
    local = request.form("local_trabalho_ra")
    acao = request.form("acao")

    select case acao
        case "patio"
            sql = "UPDATE registros_apresentacao " & _
            "SET data_hora_refeicao_patio = Now() " & _
            "WHERE usuario_dss = '" & matricula & "' " & _
            "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
            conn.execute(sql)

            call redirectPatio(supervisao, local)

            exit function
        case "CCP"
             sql = "UPDATE registros_apresentacao " & _
            "SET data_hora_refeicao_CPT = Now() " & _
            "WHERE usuario_dss = '" & matricula & "' " & _
            "AND (DateValue(data_hora_apresentacao) = Date() OR DateValue(data_hora_apresentacao) = Date() - 1)"
            conn.execute(sql)

            call redirectCPT(supervisao)

            exit function
    end select
End Function

Function consultaVerificarLanchePatio(supervisao, local, turnoInicio, turnoFim)
    dim sql, conn, rs
    set conn = getConexao()

    horaInicio = hour(turnoInicio)
    horaFim = hour(turnoFim)
    condHoraRa = condicaoHoraSQL("ra.data_hora_apresentacao", horaInicio, horaFim)
    condHoraRa1 = condicaoHoraSQL("ra1.data_hora_apresentacao", horaInicio, horaFim)

    sql = "SELECT " & _
    "IIF(COUNT(*) Mod 2 = 0, COUNT(*) / 2, ((COUNT(*) - 1) / 2) + 1) AS metadeTurma, " & _
    "SUM(IIF(ra.data_hora_lanche_patio IS NOT NULL, 1, 0)) AS comLanche " & _
    "FROM registros_apresentacao AS ra " & _
    "INNER JOIN login_dss AS ld ON ra.usuario_dss = ld.usuario_dss " & _
    "WHERE ra.supervisao_ra = '" & supervisao & "' " & _
    "AND ra.local_trabalho_ra = '" & local & "' " & _
    "AND DateValue(ra.data_hora_apresentacao) = Date() " & _
    "AND " & condHoraRa
    set rs = conn.Execute(sql)

    consultaVerificarLanchePatio = rs
End Function

Function consultaVerificarRefeicaoPatio(supervisao, local, turnoInicio, turnoFim)
    dim sql, conn, rs
    set conn = getConexao()

    horaInicio = hour(turnoInicio)
    horaFim = hour(turnoFim)
    condHoraRa = condicaoHoraSQL("ra.data_hora_apresentacao", horaInicio, horaFim)
    condHoraRa1 = condicaoHoraSQL("ra1.data_hora_apresentacao", horaInicio, horaFim)

    sql = "SELECT " & _
    "IIF(COUNT(*) Mod 2 = 0, COUNT(*) / 2, ((COUNT(*) - 1) / 2)) AS metadeTurma, " & _
    "SUM(IIF(ra.data_hora_refeicao_patio IS NOT NULL, 1, 0)) AS comRefeicao " & _ 
    "FROM registros_apresentacao AS ra " & _
    "INNER JOIN login_dss AS ld ON ra.usuario_dss = ld.usuario_dss " & _
    "WHERE ra.supervisao_ra = '" & supervisao & "' " & _
    "AND ra.local_trabalho_ra = '" & local & "' " & _
    "AND DateValue(ra.data_hora_apresentacao) = Date() " & _
    "AND " & condHoraRa

    set rs = conn.Execute(sql)
    'response.write sql

    consultaVerificarRefeicaoPatio = rs
End Function

Function condicaoHoraSQL(campoNome, horaInicio, horaFim)
    if horaInicio <= horaFim then
        condicaoHoraSQL = "Hour(TimeValue(" & campoNome & ")) BETWEEN " & horaInicio & " AND " & horaFim
    else
        condicaoHoraSQL = "(Hour(TimeValue(" & campoNome & ")) >= " & horaInicio & " OR " & "Hour(TimeValue(" & campoNome & ")) <= " & horaFim & ")"
    end if
End Function

'call consultaVerificarRefeicaoPatio("TORRE_A", "Hump_Yard", timeserial(17, 0, 0), timeserial(5, 0, 0))
%>
