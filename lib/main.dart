import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:audioplayers/audioplayers.dart';

void main() {
  runApp(MiAppMP3());
}

class MiAppMP3 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Descargador MP3",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.blue),
      home: DescargadorPage(),
    );
  }
}

class DescargadorPage extends StatefulWidget {
  @override
  _DescargadorPageState createState() => _DescargadorPageState();
}

class _DescargadorPageState extends State<DescargadorPage> {
  TextEditingController urlController = TextEditingController();
  String estado = "";
  AudioPlayer player = AudioPlayer();
  List<File> canciones = [];

  final String backendURL = "https://cachimp3-1.onrender.com/download";

  @override
  void initState() {
    super.initState();
    cargarCanciones();
  }

  Future<Directory> obtenerCarpeta() async {
    return await getApplicationDocumentsDirectory();
  }

  Future<void> cargarCanciones() async {
    Directory dir = await obtenerCarpeta();
    final archivos = dir.listSync().whereType<File>().toList();
    setState(() {
      canciones = archivos.where((f) => f.path.endsWith(".mp3")).toList();
    });
  }

  Future<void> descargarDesdeBackend(String youtubeUrl) async {
    try {
      setState(() {
        estado = "Solicitando descarga...";
      });

      // Llamada POST al backend
      final response = await http.post(
        Uri.parse(backendURL),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"url": youtubeUrl}),
      );

      if (response.statusCode != 200) {
        setState(() {
          estado = "Error del servidor: ${response.body}";
        });
        return;
      }

      // Parseamos la respuesta JSON
      final data = jsonDecode(response.body);
      final filename = data['filename'];
      final fileURL = "https://cachimp3-1.onrender.com/file/$filename";

      // Carpeta local
      Directory dir = await obtenerCarpeta();
      String savePath = "${dir.path}/$filename";

      // Descargar MP3 con Dio
      Dio dio = Dio();
      await dio.download(fileURL, savePath);

      setState(() {
        estado = "Descargado: $filename";
      });

      cargarCanciones();
    } catch (e) {
      setState(() {
        estado = "Error: $e";
      });
    }
  }

  void reproducir(File archivo) async {
    await player.stop();
    await player.play(DeviceFileSource(archivo.path));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Descargador MP3 YouTube")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: urlController,
              decoration: InputDecoration(
                labelText: "Ingresa URL de YouTube",
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 10),
            ElevatedButton(
              onPressed: () {
                descargarDesdeBackend(urlController.text);
              },
              child: Text("Descargar"),
            ),
            SizedBox(height: 10),
            Text(estado),
            SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: canciones.length,
                itemBuilder: (context, index) {
                  final file = canciones[index];
                  return ListTile(
                    title: Text(file.path.split("/").last),
                    trailing: IconButton(
                      icon: Icon(Icons.play_arrow),
                      onPressed: () => reproducir(file),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
