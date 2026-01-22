<script>
window.canvasCharts = window.canvasCharts || [];

window.onload = function() {
  // GRÁFICOS APRESENTAÇÃO X PRONTIDÃO
    <%
    Dim sql, rs

    sql = "SELECT " & _
        "total.supervisao_ra, " & _
        "IIf(IsNull(desvios.contagem_desvios), 0, desvios.contagem_desvios) AS contagem_desvios, " & _
        "total.contagem_total " & _
    "FROM " & _
        "( " & _
            "SELECT supervisao_ra, Count(*) AS contagem_total " & _
            "FROM registros_apresentacao " & _
            "WHERE Month(DateValue(data_hora_apresentacao)) = Month(Date()) " & supWhere & _
            "GROUP BY supervisao_ra " & _
        ") AS total " & _
    "LEFT JOIN " & _
        "( " & _
            "SELECT supervisao_ra, Count(*) AS contagem_desvios " & _
            "FROM registros_apresentacao " & _
            "WHERE (registros_apresentacao.tempo_apresentacao_prontidao_min BETWEEN 16 AND 90 OR registros_apresentacao.tempo_apresentacao_prontidao_min Is Null) " & supWhere & _
            "AND Month(DateValue(data_hora_apresentacao)) = Month(Date()) " & _
            "GROUP BY supervisao_ra " & _
        ") AS desvios " & _
    "ON total.supervisao_ra = desvios.supervisao_ra;"

    Set rs = conn.Execute(sql)
  
    %>
    var chart_acumulado = new CanvasJS.Chart("acumuladoMes", {
      animationEnabled: true,
      exportEnabled: true,
      theme: "light1",
      title: {
        text: "TX de Desvios Acumulado por Sup. - Mês ATUAL ( % )"
      },
      subtitles: [{
        text: "(Apres. x Pront. > 15 min)",
        fontSize: 16
      }],
      axisY: {
        title: "Total de 'Pronto com atraso'"
      },
      data: [{
        type: "column",
        indexLabelFontSize: 20,
        dataPoints: [      
        <% 
        Dim cores
        cores = Array("#00716d", "#007e7a", "#198a87", "#329794", "#4ca4a1")
        Dim corIndex
        corIndex = 0

        Do Until rs.EOF 
        %>
        {
          label: "<% If rs("supervisao_ra") = "PV_AB" Then Response.Write "VPN" Else Response.Write Replace(rs("supervisao_ra"), "_", " ") %>",
          y: <%= rs("contagem_desvios") %>,
          indexLabel: "<% If rs("contagem_desvios") <> 0 And rs("contagem_total") <> 0 Then Response.Write Round((rs("contagem_desvios") / rs("contagem_total")) * 100, 2) Else Response.Write "0" %>%",
          color: "<%= cores(corIndex Mod UBound(cores) + 1) %>"
        }<% 
          rs.MoveNext
          corIndex = corIndex + 1
          If Not rs.EOF Then Response.Write "," 
        Loop 
        %>
      ]
    }]
    });
    chart_acumulado.render();
    window.canvasCharts.push(chart_acumulado);

    <%
    dim ano_diario, mes_atual, dataAtual, ultimoDia, dataStr, dataPointsStr_d
    dim taxas_diarias : set taxas_diarias = Server.CreateObject("Scripting.Dictionary")
    ano_diario = Year(Date())
    mes_atual = Month(Date())
    dataPointsStr_d = ""

    ' Define o intervalo de datas de junho
    dataAtual = DateSerial(ano_diario, mes_atual, 1)
    ultimoDia = DateSerial(ano_diario, mes_atual + 1, 0)

    Do While dataAtual <= ultimoDia
      dataStr = "#" & Month(dataAtual) & "/" & Day(dataAtual) & "/" & Year(dataAtual) & "#"

      sql_total = "SELECT COUNT(*) AS total FROM registros_apresentacao " & _ 
                  "WHERE DateValue(data_hora_apresentacao) = " & dataStr & supWhere 

      set rs_total = conn.execute(sql_total)

      sql_desvios = "SELECT COUNT(*) AS total FROM registros_apresentacao " & _ 
                    "WHERE DateValue(data_hora_apresentacao) = " & dataStr & " " & supWhere & _
                    "AND (tempo_apresentacao_prontidao_min BETWEEN 16 AND 90 OR tempo_apresentacao_prontidao_min IS NULL)"

      set rs_desvios = conn.execute(sql_desvios)

      if rs_total("total") > 0 then
        taxas_diarias.add dataAtual, Replace(Round((rs_desvios("total") / rs_total("total")) * 100, 2), ",", ".")
      else
        taxas_diarias.add dataAtual, 0
      end if

      dataPointsStr_d = dataPointsStr_d & "{ x: new Date(" & Year(dataAtual) & ", " & (Month(dataAtual)-1) & ", " & Day(dataAtual) & "), y: " & taxas_diarias(dataAtual) & ", indexLabel: '" & taxas_diarias(dataAtual) & "%'}"
      if dataAtual < ultimoDia then
        dataPointsStr_d = dataPointsStr_d & ","
      end if

      dataAtual = DateAdd("d", 1, dataAtual)
    Loop
    %>

    var chart_taxa_diario = new CanvasJS.Chart("linha-taxa-diario", {
      animationEnabled: true,
      title:{
        text: "Taxa de Desvios DIÁRIO - <%= UCase(MonthName(Month(Date()))) & " " & Year(Date()) %>"
      },
      subtitles: [{
        text: "(Apres. x Pront. > 15 min)",
        fontSize: 16
      }],
      axisX:{
        title: "Dia",
        valueFormatString: "DD",
        interval: 1
      },
      axisY: {
        title: "Taxa de Desvios (%)",
        suffix: "%"
      },
      data: [{
        type: "line",
        xValueFormatString: "DD MMM",
        color: "#007E7A",
        indexLabelFontSize: 14,
        yValueFormatString: "##,##%",
        dataPoints: [
          <%= dataPointsStr_d %>
        ]
      }]
    });
    chart_taxa_diario.render();
    window.canvasCharts.push(chart_taxa_diario)

    <%
    dim mes, ano, dataPointsStr
    dim taxas_mensais : set taxas_mensais = Server.CreateObject("Scripting.Dictionary")
    ano = Year(Date())
    dataPointsStr = ""

    For mes = 1 to 12
      sql_total = "SELECT COUNT(*) AS total " & _
      "FROM registros_apresentacao " & _
      "WHERE Year(DateValue(data_hora_apresentacao)) = " & ano & " " & _
      "AND Month(DateValue(data_hora_apresentacao)) = " & mes & supWhere 

      set rs_total = conn.execute(sql_total)

      sql_desvios = "SELECT COUNT(*) AS total " & _
      "FROM registros_apresentacao " & _
      "WHERE (Year(DateValue(data_hora_apresentacao)) = " & ano & " " & _
      "AND Month(DateValue(data_hora_apresentacao)) = " & mes & ") " & _
      "AND (registros_apresentacao.tempo_apresentacao_prontidao_min BETWEEN 16 AND 90 OR registros_apresentacao.tempo_apresentacao_prontidao_min Is Null)" & supWhere 
      set rs_desvios = conn.execute(sql_desvios)

      if rs_total("total") > 0 then
        taxas_mensais.add mes, Replace(Round((rs_desvios("total") / rs_total("total")) * 100, 2), ",", ".")
      else
        taxas_mensais.add mes, 0
      end if

      dataPointsStr = dataPointsStr & "{ x: new Date(" & ano & ", " & (mes - 1) & "), y: " & taxas_mensais(mes) & ", indexLabel: '" & taxas_mensais(mes) & "%'}"
      if mes < 12 then
        dataPointsStr = dataPointsStr & ","
      end if
    Next
    %>
    var chart_taxa_mensal = new CanvasJS.Chart("linha-taxa-mensal", {
      animationEnabled: true,
      title:{
        text: "Taxa de Desvios por Mês - <%= ano %>"   
      },
      subtitles: [{
        text: "(Apres. x Pront. > 15 min)",
        fontSize: 16
      }],
      axisX: {
        title: "Mês",
        interval: 1,
        intervalType: "month",
        valueFormatString: "MMM"
      },
      axisY:{
        title: "Taxa de Desvios (%)",
        suffix: "%"
      },
      data: [{        
        type: "line",
        color: "#007E7A",
        markerSize: 12,
        indexLabelFontSize: 12,
        xValueFormatString: "MMM, YYYY",
        yValueFormatString: "##,##%",
        dataPoints: [        
          <%= dataPointsStr%>
        ]
      }]
    });
    chart_taxa_mensal.render();
    window.canvasCharts.push(chart_taxa_mensal);

    <%
    sql_coluna_d_1 = "SELECT supervisao_ra AS sup, COUNT(*) AS total " & _
    "FROM registros_apresentacao " & _
    "WHERE " & _
      "(registros_apresentacao.tempo_apresentacao_prontidao_min BETWEEN 16 AND 90 OR registros_apresentacao.tempo_apresentacao_prontidao_min Is Null) " & _
      "AND " & _
      "(" & _
        "DateValue(data_hora_apresentacao) >= Date() - 1 " & _
        "AND DateValue(data_hora_apresentacao) < Date() " & _
      ") " & supWhere & _
    "GROUP BY supervisao_ra " & _
    "ORDER BY supervisao_ra DESC"

    set rs_coluna_d_1 = conn.execute(sql_coluna_d_1)

    sql_coluna_d = "SELECT supervisao_ra AS sup, COUNT(*) AS total " & _
    "FROM registros_apresentacao " & _
    "WHERE " & _
      "(registros_apresentacao.tempo_apresentacao_prontidao_min BETWEEN 16 AND 90 OR registros_apresentacao.tempo_apresentacao_prontidao_min Is Null) " & _
      "AND " & _
      "(" & _
        "DateValue(data_hora_apresentacao) = Date() " & _
      ") " & supWhere & _
    "GROUP BY supervisao_ra " & _
    "ORDER BY supervisao_ra DESC"

    set rs_coluna_d = conn.execute(sql_coluna_d)
    %>
    var chart_comparativo_dias = new CanvasJS.Chart("dia_e_dia-1", {
      animationEnabled: true,
      exportEnabled: true,
      title:{
        text: "Comparativo Diário de Desvios (D-1 | D)"
      },
      subtitles: [{
        text: "(Apres. x Pront. > 15 min)",
        fontSize: 16
      }],
      axisY: {
        titleFontColor: "black",
        lineColor: "black",
        labelFontColor: "black",
        tickColor: "black"
      },
      toolTip: {
        shared: true
      },
      legend: {
        cursor:"pointer"
      },
      data: [{
        type: "column",
        name: "QTD D-1",
        legendText: "Desvios D-1",
        color: "#007E7A",
        indexLabelFontSize: 20,
        showInLegend: true, 
        dataPoints:[
          <% Do Until rs_coluna_d_1.eof %>
          {
            label: "<% if rs_coluna_d_1("sup") = "PV_AB" then response.write "VPN" else response.write Replace(rs_coluna_d_1("sup"), "_", " ") end if %>",
            y: <%= rs_coluna_d_1("total") %>,
            indexLabel: "<%= rs_coluna_d_1("total") %>"
          }<% If Not rs_coluna_d_1.eof Then Response.Write "," %>
          <% rs_coluna_d_1.MoveNext %>
          <% Loop %>
        ]
      },
      {
        type: "column",	
        name: "QTD D",
        legendText: "Desvios D",
        color: "#ECB11F",
        indexLabelFontSize: 20,
        showInLegend: true,
        dataPoints:[
          <% Do Until rs_coluna_d.eof %>
          {
            label: "<% if rs_coluna_d("sup") = "PV_AB" then response.write "VPN" else response.write Replace(rs_coluna_d("sup"), "_", " ") end if %>",
            y: <%= rs_coluna_d("total") %>,
            indexLabel: "<%= rs_coluna_d("total") %>"
          }<% If Not rs_coluna_d.eof Then Response.Write "," %>
          <% rs_coluna_d.MoveNext %>
          <% Loop %>
        ]
      }]
    });
    chart_comparativo_dias.render();
    window.canvasCharts.push(chart_comparativo_dias);

    <%        
    sql_unificada_just_diario = _
    "SELECT t.label, Sum(t.ap) AS total_ap, Sum(t.pr) AS total_pr " & _
    "FROM (" & _
    "    SELECT justificativa_atraso_apresentacao AS label, COUNT(*) AS ap, 0 AS pr " & _
    "    FROM registros_apresentacao " & _
    "    WHERE DateValue(data_hora_apresentacao) = Date() " & _
    "      AND justificativa_atraso_apresentacao IS NOT NULL " & _
    "      AND justificativa_atraso_apresentacao <> '' " & supWhere & _
    "    GROUP BY justificativa_atraso_apresentacao " & _
    "    UNION ALL " & _
    "    SELECT justificativa_atraso_prontidao AS label, 0 AS ap, COUNT(*) AS pr " & _
    "    FROM registros_apresentacao " & _
    "    WHERE DateValue(data_hora_apresentacao) = Date() " & _
    "      AND justificativa_atraso_prontidao IS NOT NULL " & _
    "      AND justificativa_atraso_prontidao <> '' " & supWhere & _
    "    GROUP BY justificativa_atraso_prontidao " & _
    ") AS t " & _
    "GROUP BY t.label " & _
    "ORDER BY t.label DESC;"

    Set rs_unificada_just_diario = conn.Execute(sql_unificada_just_diario)

    ' --- Monta os dois arrays na MESMA ordem de labels ---
    dataAp_diario = ""
    dataPr_diario = ""
    Do Until rs_unificada_just_diario.EOF
      ap_d = rs_unificada_just_diario("total_ap")
      pr_d = rs_unificada_just_diario("total_pr")

      if ap_d = 0 then
        ap_d = "null"
      end if

      if pr_d = 0 then
        pr_d = "null"
      end if

      If dataAp_diario <> "" Then dataAp_diario = dataAp_diario & ","
      If dataPr_diario <> "" Then dataPr_diario = dataPr_diario & ","

      dataAp_diario = dataAp_diario & "{ label: '" & rs_unificada_just_diario("label") & "', y: " & ap_d & ", indexLabel: '" & ap_d & " emp.'}"
      dataPr_diario = dataPr_diario & "{ label: '" & rs_unificada_just_diario("label") & "', y: " & pr_d & ", indexLabel: '" & pr_d & " emp.'}"

      rs_unificada_just_diario.MoveNext
    Loop
    %>
    var chart_justificativas_mensal = new CanvasJS.Chart("justificativas-diario", {
      theme: "light",
      animationEnabled: true,
      exportEnabled: true,
      title: { text: "QTD Justificativas Apresentação & Prontidão - DIÁRIO" },
      axisX: { interval: 1 },           // em "bar", o eixo de categorias é Y; mantenho X p/ compat.
      axisY2: {
        interlacedColor: "rgba(1,77,101,.2)",
        gridColor: "rgba(1,77,101,.1)"
      },
      data: [
        {
          type: "bar",
          color: "#007E7A",
          name: "Apresentação",
          showInLegend: true,
          indexLabel: "{y}",
          indexLabelFontSize: 16,
          axisYType: "secondary",
          dataPoints: [ <%= dataAp_diario %> ]
        },
        {
          type: "bar",
          color: "#ECB11F",
          name: "Prontidão",
          showInLegend: true,
          indexLabel: "{y}",
          indexLabelFontSize: 16,
          axisYType: "secondary",
          dataPoints: [ <%= dataPr_diario %> ]
        }
      ]
    });
    chart_justificativas_mensal.render();
    window.canvasCharts.push(chart_justificativas_mensal);

    <%        
    sql_unificada_just_mensal = _
    "SELECT t.label, Sum(t.ap) AS total_ap, Sum(t.pr) AS total_pr " & _
    "FROM (" & _
    "    SELECT justificativa_atraso_apresentacao AS label, COUNT(*) AS ap, 0 AS pr " & _
    "    FROM registros_apresentacao " & _
    "    WHERE Month(DateValue(data_hora_apresentacao)) = Month(Date()) " & _
    "      AND justificativa_atraso_apresentacao IS NOT NULL " & _
    "      AND justificativa_atraso_apresentacao <> '' " & supWhere & _
    "    GROUP BY justificativa_atraso_apresentacao " & _
    "    UNION ALL " & _
    "    SELECT justificativa_atraso_prontidao AS label, 0 AS ap, COUNT(*) AS pr " & _
    "    FROM registros_apresentacao " & _
    "    WHERE Month(DateValue(data_hora_apresentacao)) = Month(Date()) " & _
    "      AND justificativa_atraso_prontidao IS NOT NULL " & _
    "      AND justificativa_atraso_prontidao <> '' " & supWhere & _
    "    GROUP BY justificativa_atraso_prontidao " & _
    ") AS t " & _
    "GROUP BY t.label " & _
    "ORDER BY t.label DESC;"

    Set rs_unificada_just_mensal = conn.Execute(sql_unificada_just_mensal)

    ' --- Monta os dois arrays na MESMA ordem de labels ---
    dataAp_mensal = ""
    dataPr_mensal = ""
    Do Until rs_unificada_just_mensal.EOF
      ap_m = rs_unificada_just_mensal("total_ap")
      pr_m = rs_unificada_just_mensal("total_pr")

      if ap_m = 0 then
        ap_m = "null"
      end if

      if pr_m = 0 then
        pr_m = "null"
      end if

      If dataAp_mensal <> "" Then dataAp_mensal = dataAp_mensal & ","
      If dataPr_mensal <> "" Then dataPr_mensal = dataPr_mensal & ","

      dataAp_mensal = dataAp_mensal & "{ label: '" & rs_unificada_just_mensal("label") & "', y: " & ap_m & ", indexLabel: '" & ap_m & " emp.'}"
      dataPr_mensal = dataPr_mensal & "{ label: '" & rs_unificada_just_mensal("label") & "', y: " & pr_m & ", indexLabel: '" & pr_m & " emp.'}"

      rs_unificada_just_mensal.MoveNext
    Loop
    %>
    var chart_justificativas_mensal = new CanvasJS.Chart("justificativas-mensal", {
      width: 1200,
      theme: "light",
      animationEnabled: true,
      exportEnabled: true,
      title: { text: "QTD Justificativas Apresentação & Prontidão - MENSAL", fontSize: 24 },
      axisX: { interval: 1 },           // em "bar", o eixo de categorias é Y; mantenho X p/ compat.
      axisY2: {
        interlacedColor: "rgba(1,77,101,.2)",
        gridColor: "rgba(1,77,101,.1)",
        labelFontSize: 10
      },
      data: [
        {
          type: "bar",
          color: "#007E7A",
          name: "Apresentação",
          showInLegend: true,
          indexLabel: "{y}",
          indexLabelFontSize: 14,
          axisYType: "secondary",
          dataPoints: [ <%= dataAp_mensal %> ]
        },
        {
          type: "bar",
          color: "#ECB11F",
          name: "Prontidão",
          showInLegend: true,
          indexLabel: "{y}",
          indexLabelFontSize: 14,
          axisYType: "secondary",
          dataPoints: [ <%= dataPr_mensal %> ]
        }
      ]
    });
    chart_justificativas_mensal.render();
    window.canvasCharts.push(chart_justificativas_mensal);

  // GRÁFICOS 06H/18H X PRONTIDÃO
    
    <%
    ' === CONSULTAS (iguais às suas) ===
    sql_grafico_meta = "SELECT " & _
        "supervisao_ra, " & _
        "CInt(AVG(Abs(IIF(" & _
            "turno_funcionario = '06x18', " & _
            "DateDiff('n', DateValue(data_hora_prontidao_ra) + TimeValue('06:00:00'), data_hora_prontidao_ra), " & _
            "DateDiff('n', DateValue(data_hora_prontidao_ra) + TimeValue('18:00:00'), data_hora_prontidao_ra)" & _
        ")))) AS media " & _
    "FROM registros_apresentacao " & _
    "WHERE data_hora_prontidao_ra IS NOT NULL " & _
    "AND turno_funcionario IN ('06x18', '18x06') " & _
    "AND Day(DateValue(data_hora_apresentacao)) = Day(Date()) " & _
    "AND (" & _
    "justificativa_atraso_apresentacao IS NULL " & _
    "OR justificativa_atraso_apresentacao NOT IN (" & _
    "'PM - Exame Periódico', 'PM - Exame de Retorno', 'DSS com Liderança', 'Horário ADM', 'Necessidade Fisiológica'" & _
    ")" & _
    ") " & _
    "AND (" & _
    "justificativa_atraso_prontidao IS NULL " & _
    "OR (" & _
    "justificativa_atraso_prontidao NOT IN ('Necessidade Fisiológica', 'Teste ou Instrução de Uso') " & _
    "AND (justificativa_atraso_prontidao <> 'Perda no TAC' OR tempo_apresentacao_prontidao_min < 30) " & _
    ")" & _
    ") " & _
    "AND tempo_horario_exato_prontidao_min <= 60 " & supWhere & _
    "GROUP BY supervisao_ra"

    Set rs_grafico_meta = conn.Execute(sql_grafico_meta)

    sql_grafico_meta_ap_pr = "SELECT " & _
        "supervisao_ra, " & _
        "CInt(AVG(Abs(IIF(" & _
            "turno_funcionario = '06x18', " & _
            "DateDiff('n', data_hora_apresentacao, data_hora_prontidao_ra), " & _
            "DateDiff('n', data_hora_apresentacao, data_hora_prontidao_ra)" & _
        ")))) AS media " & _
    "FROM registros_apresentacao " & _
    "WHERE data_hora_prontidao_ra IS NOT NULL " & _
    "AND turno_funcionario IN ('06x18', '18x06') AND Month(DateValue(data_hora_apresentacao)) = Month(Date()) " & _
    "AND (tempo_apresentacao_prontidao_min < 90 OR tempo_apresentacao_prontidao_min Is Null) " & supWhere & _
    "GROUP BY supervisao_ra"

    Set rs_grafico_meta_ap_pr = conn.Execute(sql_grafico_meta_ap_pr)

    ' === MONTA AS SÉRIES (3 strings de datapoints) ===
    Dim dpCol_ApPr, dpCol_6806, dpLine_Taxa
    dpCol_ApPr = "" : dpCol_6806 = "" : dpLine_Taxa = ""

    ' 1) Coluna: Apresentação -> Prontidão (mensal / verde)
    Do Until rs_grafico_meta_ap_pr.EOF
      Dim label1, y1, color1
      label1 = rs_grafico_meta_ap_pr("supervisao_ra")
      If label1 = "PV_AB" Then
        label1 = "VPN"
      Else
        label1 = Replace(label1, "_", " ")
      End If

      y1 = rs_grafico_meta_ap_pr("media")
      if y1 > 15 then
        color1 = "#c64641"
      else
        color1 = "#007E7A"
      end if

      dpCol_ApPr = dpCol_ApPr & "{ label: '" & label1 & "', y: " & Replace(CStr(y1), ",", ".") & _
                  ", color: '" & color1 & "', indexLabel: '" & y1 & " min' }"

      rs_grafico_meta_ap_pr.MoveNext
      If Not rs_grafico_meta_ap_pr.EOF Then dpCol_ApPr = dpCol_ApPr & ","
    Loop

    ' 2) Coluna: 06h/18h -> Prontidão (diário / amarelo)
    '    + 3) Linha: Taxa de redução (%) calculada a partir da mesma média desta série
    Do Until rs_grafico_meta.EOF
      Dim label2, y2, color2, taxa
      label2 = rs_grafico_meta("supervisao_ra")
      If label2 = "PV_AB" Then
        label2 = "VPN"
      Else
        label2 = Replace(label2, "_", " ")
      End If

      y2 = rs_grafico_meta("media") ' minutos
      if y2 > 42 then
        color2 = "#c64641"
      else 
        color2 = "#ECB11F"
      end if

      ' datapoint da coluna amarela
      dpCol_6806 = dpCol_6806 & "{ label: '" & label2 & "', y: " & Replace(CStr(y2), ",", ".") & _
                  ", color: '" & color2 & "', indexLabel: '" & y2 & " min'}"

      ' datapoint da linha azul (taxa %)
      taxa = Round((1 - (y2 / 57)) * 100, 2)
      dpLine_Taxa = dpLine_Taxa & "{ label: '" & label2 & "', y: " & Replace(CStr(taxa), ",", ".") & ", " & _
      "indexLabel: '" & Replace(CStr(taxa), ",", ".") & "%'}"

      rs_grafico_meta.MoveNext
      If Not rs_grafico_meta.EOF Then
        dpCol_6806 = dpCol_6806 & ","
        dpLine_Taxa = dpLine_Taxa & ","
      End If
    Loop
    %>
    var chart_meta = new CanvasJS.Chart("meta", {
      animationEnabled: true,
      exportEnabled: true,
      theme: "light",
      title: {
        text: "Média de Prontidão por Supervisão - DIÁRIO"
      },
      axisY: {
        title: "Minutos",
        suffix: " min",
        scaleBreaks: {
          customBreaks: [{
            startValue: 41, endValue: 42, type: "straight", color: "#555555"
          }]
        }
      },
      axisY2: {
        title: "Taxa de Redução",
        suffix: " %",
        maximum: 100, // ajuste se necessário
        gridThickness: 0
      },
      toolTip: { shared: true },
      legend: { cursor: "pointer" },
      data: [
        {
          type: "column",
          name: "Apresentação → Prontidão",
          color: "#007E7A",
          showInLegend: true,
          yValueFormatString: "#,##0 min",
          indexLabelFontSize: 14,
          dataPoints: [ <%= dpCol_ApPr %>   ]
        },
        {
          type: "column",
          name: "06h/18h → Prontidão",
          color: "#ECB11F",
          showInLegend: true,
          yValueFormatString: "#,##0 min",
          indexLabelFontSize: 14,
          dataPoints: [ <%= dpCol_6806 %> ]
        },
        {
          type: "line",
          name: "Taxa de Redução",
          showInLegend: true,
          color: "#2D73FF",          // azul
          axisYType: "secondary",    // usa o eixo de %
          markerSize: 6,
          lineThickness: 3,
          dataPoints: [<%= dpLine_Taxa %> ]
        }
      ]
    });
    chart_meta.render();
    window.canvasCharts.push(chart_meta);

    <%
    Dim mes_reducao, ano_reducao
    Dim dataSeriesJson, medias_mes, i, sup, supKey, key, m, y, dp, sql_sup_medias, taxa_reducao
    Dim series_media : Set series_media = Server.CreateObject("Scripting.Dictionary")
    series_media.CompareMode = 1

    Dim supList : supList = Array("PV_AB", "TORRE_A", "TORRE_B", "TORRE_C", "Torre_L")
    ano_reducao = Year(Date())

    ' Inicializa a string de pontos por supervisão
    For i = 0 To UBound(supList)
      series_media(supList(i)) = ""
    Next

    For mes_reducao = 1 To 12

      ' Consulta por mês, agregando por supervisão (somente as 5 desejadas)
      sql_sup_medias = "SELECT " & _
          "supervisao_ra, " & _
          "CInt(AVG(Abs(IIF(" & _
              "turno_funcionario = '06x18', " & _
              "DateDiff('n', DateValue(data_hora_prontidao_ra) + TimeValue('06:00:00'), data_hora_prontidao_ra), " & _
              "DateDiff('n', DateValue(data_hora_prontidao_ra) + TimeValue('18:00:00'), data_hora_prontidao_ra)" & _
          ")))) AS media " & _
      "FROM registros_apresentacao " & _
      "WHERE data_hora_prontidao_ra IS NOT NULL " & _
      "AND turno_funcionario IN ('06x18', '18x06') " & _
      "AND (Year(DateValue(data_hora_apresentacao)) = " & ano_reducao & " " & _
      "AND Month(DateValue(data_hora_apresentacao)) = " & mes_reducao & ") " & _
      "AND tempo_apresentacao_prontidao_min < 90 " & _
      "AND ((justificativa_atraso_prontidao Is Null OR justificativa_atraso_prontidao Is Not Null) AND tempo_apresentacao_prontidao_min < 30) " & _
      "AND justificativa_atraso_apresentacao Not IN (" & _
      "'Checklist de Retorno', " & _
      "'DSS com Gerente', " & _
      "'PM - Exame Periódico', " & _
      "'PM - Exame de Retorno', " & _
      "'Horário ADM', " & _
      "'Necessidade Fisiológica', " & _
      "'Perda no TAC', " & _
      "'DSS com Liderança', " & _
      "''" & _
      ") " & supWhere & _
      "GROUP BY supervisao_ra"

      Set rs = conn.Execute(sql_sup_medias)

      Set medias_mes = Server.CreateObject("Scripting.Dictionary")
      medias_mes.CompareMode = 1

      Do Until rs.EOF
        key = UCase(Trim(CStr(rs("supervisao_ra"))))
        medias_mes(key) = rs("media")
        rs.MoveNext
      Loop
      rs.Close : Set rs = Nothing

      For i = 0 To UBound(supList)
        sup = supList(i)
        supKey = UCase(Trim(CStr(sup)))

        If medias_mes.Exists(supKey) Then
          m = medias_mes(supKey)
          y = Replace(Round(m, 2), ",", ".")
          taxa_reducao = Round((1 - (y / 57)) * 100, 2)
        Else
          m = Null
          y = "null"
        End If

        dp = "{ x: new Date(" & ano_reducao & ", " & (mes_reducao - 1) & "), y: " & y & _
            ", toolTipContent: '" & sup & " | Média: " & m & " min — Taxa: " & taxa_reducao & "%', " & _
            "indexLabel: '" & m & "', indexLabelPlacement: 'outside'}"

        series_media(sup) = series_media(sup) & dp
        If mes_reducao < 12 Then
          series_media(sup) = series_media(sup) & ","
        End If
      Next
    Next

    dataSeriesJson = ""
    For i = 0 To UBound(supList)
      sup = supList(i)
      dataSeriesJson = dataSeriesJson & _
        "{ type: 'line', name: '" & sup & "', showInLegend: true, markerSize: 4, dataPoints: [" & series_media(sup) & "] }"
      If i < UBound(supList) Then dataSeriesJson = dataSeriesJson & ","
    Next
    %>
    var chart = new CanvasJS.Chart("chartContainer", {
      toolTip: {
        shared: "true"
      },
      legend:{
        cursor:"pointer"
      },
      animationEnabled: true,
      title:{
        text: "Média Mensal de Prontidão por Supervisão - OP1 (<%= ano_reducao %>)"   
      },
      markerSize: 6,
      axisX: {
        title: "Mês",
        interval: 1,
        intervalType: "month",
        valueFormatString: "MMM"
      },
      axisY:{
        title: "Minutos",
        suffix: " min",
        includeZero: false
      },
      data: [ <%= dataSeriesJson%> ]
    });
    chart.render();
    window.canvasCharts.push(chart);

    <%
    dim mes_reducao_linha, dataPointsStr_reducao, media
    dim taxas_mensais_reducao : set taxas_mensais_reducao = Server.CreateObject("Scripting.Dictionary")
    dataPointsStr_reducao = ""

    For mes_reducao_linha = 1 to 12
      sql_reducao = _
      "SELECT " & _
          "meses, " & _
          "AVG(media_supervisao) AS media " & _
      "FROM ( " & _
          "SELECT " & _
              "Month(DateValue(data_hora_apresentacao)) AS meses, " & _
              "supervisao_ra, " & _
              "CInt(AVG(IIF( " & _
                  "turno_funcionario = '06x18', " & _
                  "DateDiff('n', DateValue(data_hora_apresentacao) + TimeValue('06:00:00'), data_hora_prontidao_ra), " & _
                  "DateDiff('n', DateValue(data_hora_apresentacao) + TimeValue('18:00:00'), data_hora_prontidao_ra) " & _
              "))) AS media_supervisao " & _
          "FROM registros_apresentacao " & _
          "WHERE " & _
            "data_hora_prontidao_ra IS NOT NULL " & _
            "AND turno_funcionario IN ('06x18', '18x06') " & _
            "AND Year(DateValue(data_hora_apresentacao)) = " & ano_reducao & " " & _
            "AND Month(DateValue(data_hora_apresentacao)) = " & mes_reducao_linha & " " & _
            "AND (" & _
              "justificativa_atraso_apresentacao IS NULL " & _
              "OR justificativa_atraso_apresentacao Not In (" & _
                "'PM - Exame Periódico', " & _
                "'PM - Exame de Retorno', " & _
                "'DSS com Liderança', " & _
                "'Horário ADM', " & _
                "'Necessidade Fisiológica'" & _
              ")" & _
            ") " & _
            "AND (" & _
              "justificativa_atraso_prontidao IS NULL " & _
              "OR (" & _
                "justificativa_atraso_prontidao Not In (" & _
                  "'Necessidade Fisiológica', " & _
                  "'Teste ou Instrução de Uso'" & _
                ") " & _
                "AND (" & _
                  "justificativa_atraso_prontidao <> 'Perda no TAC' " & _
                  "OR tempo_apresentacao_prontidao_min < 30" & _
                ")" & _
              ")" & _
            ") " & _
            "AND tempo_horario_exato_prontidao_min <= 60 " & _
            "GROUP BY Month(DateValue(data_hora_apresentacao)), supervisao_ra " & _
      ") GROUP BY meses"    
    
      set rs_reducao = conn.execute(sql_reducao)

      media = 0
      if not rs_reducao.EOF and not isnull(rs_reducao("media")) then
        media = rs_reducao("media")
        taxa = Round((1 - (media / 57)) * 100, 2)
        taxas_mensais_reducao.add mes_reducao_linha, Replace(taxa, ",", ".")
      else
        taxas_mensais_reducao.add mes_reducao_linha, 0
      end if

      dataPointsStr_reducao = dataPointsStr_reducao & _
      "{ x: new Date(" & ano_reducao & ", " & (mes_reducao_linha - 1) & "), y: " & taxas_mensais_reducao(mes_reducao_linha) & ", indexLabel: '" & taxas_mensais_reducao(mes_reducao_linha) & "%', toolTipContent: 'Media (em min): " & media & "'}"
      if mes_reducao_linha < 12 then
        dataPointsStr_reducao = dataPointsStr_reducao & ","
      end if
    Next
    %>
    var chart_taxa_reducao = new CanvasJS.Chart("linha-taxa-reducao", {
      animationEnabled: true,
      title:{
        text: "Taxa de Redução da Gerência de Área - Mensal | <%= ano_reducao %>"   
      },
      axisX: {
        title: "Mês",
        interval: 1,
        intervalType: "month",
        valueFormatString: "MMM"
      },
      axisY:{
        title: "Taxa de Redução (%)",
        suffix: "%"
      },
      data: [{        
        type: "line",
        color: "#007E7A",
        markerSize: 12,
        indexLabelFontSize: 12,
        xValueFormatString: "MMM, YYYY",
        yValueFormatString: "##,##%",
        dataPoints: [        
          <%= dataPointsStr_reducao %>
        ]
      }]
    });
    chart_taxa_reducao.render();
    window.canvasCharts.push(chart_taxa_reducao);

  // GRÁFICOS CCP
    
}

function redrawAllCharts(){
  setTimeout(() => {
    (window.canvasCharts || []).forEach(c => {
      try { if (c && typeof c.render === 'function') c.render(); }
      catch(e){ console.error('CanvasJS redraw error', e); }
    });

    window.dispatchEvent(new Event('resize'));
  }, 40);
}

document.addEventListener('show.bs.tab', function(e){
  redrawAllCharts();
})
</script>